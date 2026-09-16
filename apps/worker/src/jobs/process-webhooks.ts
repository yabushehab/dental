import { prisma } from "@dentalos/db";
import { parseMetaWebhook, type InboundMessageEvent } from "@dentalos/meta";

const CONFIRM_RE = /^\s*(confirm|yes|ok|نعم|اؤكد|أؤكد)\s*!?\.?\s*$/i;

/** Auto-link a WhatsApp contact to a patient by phone suffix. */
async function findPatientByWaId(organizationId: string, waId: string): Promise<string | null> {
  const digits = waId.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const suffix = digits.slice(-8);
  const patient = await prisma.patient.findFirst({
    where: { organizationId, deletedAt: null, phone: { contains: suffix } },
  });
  return patient?.id ?? null;
}

async function handleInboundMessage(e: InboundMessageEvent): Promise<void> {
  const channel = await prisma.channel.findUnique({
    where: { platform_externalId: { platform: e.platform, externalId: e.channelExternalId } },
  });
  if (!channel) throw new Error(`No channel for ${e.platform}/${e.channelExternalId}`);

  // dedupe on the platform message id
  const existing = await prisma.message.findUnique({ where: { externalMessageId: e.messageId } });
  if (existing) return;

  let contact = await prisma.contact.findUnique({
    where: {
      organizationId_platform_externalUserId: {
        organizationId: channel.organizationId,
        platform: e.platform,
        externalUserId: e.senderId,
      },
    },
  });
  if (!contact) {
    const patientId =
      e.platform === "WHATSAPP" ? await findPatientByWaId(channel.organizationId, e.senderId) : null;
    contact = await prisma.contact.create({
      data: {
        organizationId: channel.organizationId,
        platform: e.platform,
        externalUserId: e.senderId,
        displayName: e.senderName ?? null,
        phone: e.platform === "WHATSAPP" ? `+${e.senderId.replace(/\D/g, "")}` : null,
        patientId,
      },
    });
  } else if (e.senderName && !contact.displayName) {
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: { displayName: e.senderName },
    });
  }

  const conversation = await prisma.conversation.upsert({
    where: { channelId_contactId: { channelId: channel.id, contactId: contact.id } },
    create: {
      organizationId: channel.organizationId,
      channelId: channel.id,
      contactId: contact.id,
      status: "OPEN",
      lastMessageAt: e.timestamp,
      lastInboundAt: e.timestamp,
      unreadCount: 1,
    },
    update: {
      status: "OPEN",
      lastMessageAt: e.timestamp,
      lastInboundAt: e.timestamp,
      unreadCount: { increment: 1 },
    },
  });

  await prisma.message.create({
    data: {
      organizationId: channel.organizationId,
      conversationId: conversation.id,
      direction: "IN",
      externalMessageId: e.messageId,
      type: e.type,
      body: e.text ?? null,
      status: "RECEIVED",
      at: e.timestamp,
    },
  });

  // appointment confirmation by reply
  const isConfirm = e.buttonPayload === "CONFIRM" || (e.text ? CONFIRM_RE.test(e.text) : false);
  if (isConfirm && contact.patientId) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        organizationId: channel.organizationId,
        patientId: contact.patientId,
        status: "SCHEDULED",
        startsAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { startsAt: "asc" },
    });
    if (appointment) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "CONFIRMED" },
      });
      await prisma.auditEvent.create({
        data: {
          organizationId: channel.organizationId,
          action: "appointment.confirmed",
          entityType: "Appointment",
          entityId: appointment.id,
          after: { via: "whatsapp-reply", conversationId: conversation.id },
        },
      });
    }
  }
}

export async function processWebhookEvents(): Promise<void> {
  const events = await prisma.webhookEvent.findMany({
    where: { processedAt: null },
    orderBy: { receivedAt: "asc" },
    take: 25,
  });

  for (const evt of events) {
    try {
      const parsed = parseMetaWebhook(evt.payload);
      for (const e of parsed) {
        if (e.kind === "message") {
          await handleInboundMessage(e);
        } else {
          await prisma.message.updateMany({
            where: { externalMessageId: e.messageId },
            data: { status: e.status, failReason: e.failReason ?? null },
          });
        }
      }
      await prisma.webhookEvent.update({
        where: { id: evt.id },
        data: { processedAt: new Date(), error: null },
      });
    } catch (err) {
      await prisma.webhookEvent.update({
        where: { id: evt.id },
        data: {
          processedAt: new Date(),
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
}
