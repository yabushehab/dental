import { prisma } from "@dentalos/db";
import { renderTemplateBody } from "@dentalos/meta";
import { sendViaChannel } from "../send";

type Segment = { tags?: string[]; noVisitSinceDays?: number };

/**
 * Run due campaigns: SCHEDULED + scheduledAt reached → RUNNING → send the
 * template to every matching opted-in patient with a phone → DONE with stats.
 */
export async function runCampaigns(): Promise<void> {
  const due = await prisma.campaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    include: { template: true, organization: true },
  });

  for (const campaign of due) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "RUNNING" } });

    const channel = await prisma.channel.findFirst({
      where: { organizationId: campaign.organizationId, platform: "WHATSAPP", status: "CONNECTED" },
    });

    const segment = (campaign.segment ?? {}) as Segment;
    const patients = await prisma.patient.findMany({
      where: {
        organizationId: campaign.organizationId,
        deletedAt: null,
        whatsappOptIn: true,
        phone: { not: null },
        ...(segment.tags?.length ? { tags: { hasSome: segment.tags } } : {}),
        ...(segment.noVisitSinceDays
          ? {
              appointments: {
                none: {
                  status: "COMPLETED",
                  startsAt: {
                    gte: new Date(Date.now() - segment.noVisitSinceDays * 24 * 60 * 60 * 1000),
                  },
                },
              },
            }
          : {}),
      },
    });

    let sent = 0;
    let skipped = 0;
    for (const patient of patients) {
      if (!channel || !patient.phone) {
        skipped++;
        continue;
      }
      const waId = patient.phone.replace(/\D/g, "");
      const params = [patient.firstName, campaign.organization.name];
      const result = await sendViaChannel(channel, waId, {
        kind: "template",
        name: campaign.template.name,
        language: campaign.template.language,
        params,
      });
      if (!result.ok) {
        skipped++;
        continue;
      }
      sent++;

      const contact = await prisma.contact.upsert({
        where: {
          organizationId_platform_externalUserId: {
            organizationId: campaign.organizationId,
            platform: "WHATSAPP",
            externalUserId: waId,
          },
        },
        create: {
          organizationId: campaign.organizationId,
          platform: "WHATSAPP",
          externalUserId: waId,
          displayName: `${patient.firstName} ${patient.lastName}`,
          phone: patient.phone,
          patientId: patient.id,
        },
        update: {},
      });
      const conversation = await prisma.conversation.upsert({
        where: { channelId_contactId: { channelId: channel.id, contactId: contact.id } },
        create: {
          organizationId: campaign.organizationId,
          channelId: channel.id,
          contactId: contact.id,
          lastMessageAt: new Date(),
        },
        update: { lastMessageAt: new Date() },
      });
      await prisma.message.create({
        data: {
          organizationId: campaign.organizationId,
          conversationId: conversation.id,
          direction: "OUT",
          externalMessageId: result.externalMessageId || null,
          type: "TEMPLATE",
          templateName: campaign.template.name,
          body: renderTemplateBody(campaign.template.body, params),
          status: "SENT",
        },
      });
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "DONE", stats: { targeted: patients.length, sent, skipped } },
    });
  }
}
