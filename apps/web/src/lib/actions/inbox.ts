"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "../rbac";
import { orgScoped, prisma } from "@dentalos/db";
import { renderTemplateBody } from "@dentalos/meta";
import { sendViaChannel, withinReplyWindow } from "../channel-send";

export type InboxFormState = { error?: string };

async function inboxCtx() {
  const { organization, user } = await requirePermission("inbox:write");
  return { db: orgScoped(prisma, organization.id), organization, user };
}

export async function sendMessageAction(
  conversationId: string,
  _prev: InboxFormState,
  formData: FormData,
): Promise<InboxFormState> {
  const { db, organization, user } = await inboxCtx();

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { channel: true, contact: true },
  });
  if (!conversation) return { error: "Conversation not found" };

  const templateId = String(formData.get("templateId") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  let content:
    | { kind: "text"; text: string }
    | { kind: "template"; name: string; language: string; params: string[] };
  let body: string;
  let templateName: string | null = null;

  if (templateId) {
    const template = await db.messageTemplate.findUnique({ where: { id: templateId } });
    if (!template) return { error: "Template not found" };
    const params = [
      conversation.contact.displayName?.split(" ")[0] ?? "there",
      organization.name,
    ];
    content = { kind: "template", name: template.name, language: template.language, params };
    body = renderTemplateBody(template.body, params);
    templateName = template.name;
  } else {
    if (!text) return { error: "Type a message" };
    if (
      conversation.channel.platform === "WHATSAPP" &&
      !withinReplyWindow(conversation.lastInboundAt)
    ) {
      return { error: "Outside the 24-hour window — use a template" };
    }
    content = { kind: "text", text };
    body = text;
  }

  const result = await sendViaChannel(conversation.channel, conversation.contact.externalUserId, content);
  if (!result.ok) return { error: `Send failed: ${result.error}` };

  await db.message.create({
    data: {
      organizationId: organization.id,
      conversationId,
      direction: "OUT",
      externalMessageId: result.externalMessageId || null,
      type: templateName ? "TEMPLATE" : "TEXT",
      templateName,
      body,
      status: "SENT",
      sentByUserId: user.id,
    },
  });
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), status: "OPEN" },
  });

  revalidatePath("/inbox");
  return {};
}

export async function setConversationStatusAction(
  conversationId: string,
  status: "OPEN" | "PENDING" | "RESOLVED",
): Promise<void> {
  const { db } = await inboxCtx();
  await db.conversation.updateMany({ where: { id: conversationId }, data: { status } });
  revalidatePath("/inbox");
}

export async function toggleAssignAction(conversationId: string): Promise<void> {
  const { db, user } = await inboxCtx();
  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return;
  await db.conversation.update({
    where: { id: conversationId },
    data: { assignedToUserId: conversation.assignedToUserId === user.id ? null : user.id },
  });
  revalidatePath("/inbox");
}

export async function linkContactToPatientAction(
  contactId: string,
  _prev: InboxFormState,
  formData: FormData,
): Promise<InboxFormState> {
  const { db } = await inboxCtx();
  const patientId = String(formData.get("patientId") ?? "");
  if (!patientId) return { error: "Pick a patient" };
  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { error: "Patient not found" };

  await db.contact.update({ where: { id: contactId }, data: { patientId } });
  revalidatePath("/inbox");
  return {};
}

export async function unlinkContactAction(contactId: string): Promise<void> {
  const { db } = await inboxCtx();
  await db.contact.updateMany({ where: { id: contactId }, data: { patientId: null } });
  revalidatePath("/inbox");
}
