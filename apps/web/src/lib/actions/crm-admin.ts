"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { orgScoped, prisma } from "@dentalos/db";
import { encryptToken } from "@dentalos/meta";
import { requirePermission } from "../rbac";

async function settingsCtx() {
  const { organization } = await requirePermission("settings:manage");
  return { db: orgScoped(prisma, organization.id), organization };
}

async function campaignsCtx() {
  const { organization, user } = await requirePermission("campaigns:manage");
  return { db: orgScoped(prisma, organization.id), organization, user };
}

// --- Channels ---------------------------------------------------------------

export async function createChannelAction(formData: FormData): Promise<void> {
  const { db, organization } = await settingsCtx();
  const parsed = z
    .object({
      platform: z.enum(["WHATSAPP", "INSTAGRAM", "FACEBOOK"]),
      externalId: z.string().trim().min(1).max(120),
      displayName: z.string().trim().min(1).max(160),
      accessToken: z.string().trim().default(""),
    })
    .safeParse({
      platform: formData.get("platform"),
      externalId: formData.get("externalId"),
      displayName: formData.get("displayName"),
      accessToken: formData.get("accessToken") ?? "",
    });
  if (!parsed.success) return;

  const secret =
    process.env.META_TOKEN_KEY ?? process.env.AUTH_SECRET ?? "dev-only-secret-change-me";
  const exists = await prisma.channel.findUnique({
    where: {
      platform_externalId: {
        platform: parsed.data.platform,
        externalId: parsed.data.externalId,
      },
    },
  });
  if (exists) return;

  await db.channel.create({
    data: {
      organizationId: organization.id,
      platform: parsed.data.platform,
      externalId: parsed.data.externalId,
      displayName: parsed.data.displayName,
      accessTokenEnc: parsed.data.accessToken
        ? encryptToken(parsed.data.accessToken, secret)
        : null,
    },
  });
  revalidatePath("/settings/channels");
}

export async function disconnectChannelAction(channelId: string): Promise<void> {
  const { db } = await settingsCtx();
  await db.channel.updateMany({
    where: { id: channelId },
    data: { status: "DISCONNECTED", accessTokenEnc: null },
  });
  revalidatePath("/settings/channels");
}

// --- Templates ---------------------------------------------------------------

export async function createTemplateAction(formData: FormData): Promise<void> {
  const { db, organization } = await settingsCtx();
  const parsed = z
    .object({
      name: z
        .string()
        .trim()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscores"),
      body: z.string().trim().min(1).max(1024),
      language: z.string().trim().min(2).max(10).default("en"),
    })
    .safeParse({
      name: formData.get("name"),
      body: formData.get("body"),
      language: formData.get("language") || "en",
    });
  if (!parsed.success) return;

  const exists = await db.messageTemplate.findFirst({
    where: { name: parsed.data.name, language: parsed.data.language },
  });
  if (exists) return;

  await db.messageTemplate.create({
    data: {
      organizationId: organization.id,
      name: parsed.data.name,
      body: parsed.data.body,
      language: parsed.data.language,
      // real Meta submission happens once a WhatsApp channel with a token exists
      approvalStatus: "DRAFT",
    },
  });
  revalidatePath("/settings/templates");
}

/** Local approval marker for simulated mode (with real credentials this becomes a Meta API submission). */
export async function markTemplateApprovedAction(templateId: string): Promise<void> {
  const { db } = await settingsCtx();
  await db.messageTemplate.updateMany({
    where: { id: templateId },
    data: { approvalStatus: "APPROVED" },
  });
  revalidatePath("/settings/templates");
}

// --- Reminder rules --------------------------------------------------------------

export async function createReminderRuleAction(formData: FormData): Promise<void> {
  const { db, organization } = await settingsCtx();
  const parsed = z
    .object({
      offsetHours: z.coerce.number().int().min(1).max(24 * 14),
      templateId: z.string().trim().default(""),
      requiresConfirmation: z.boolean(),
    })
    .safeParse({
      offsetHours: formData.get("offsetHours"),
      templateId: formData.get("templateId") ?? "",
      requiresConfirmation: formData.get("requiresConfirmation") === "on",
    });
  if (!parsed.success) return;

  await db.reminderRule.create({
    data: {
      organizationId: organization.id,
      offsetHours: parsed.data.offsetHours,
      templateId: parsed.data.templateId || null,
      requiresConfirmation: parsed.data.requiresConfirmation,
    },
  });
  revalidatePath("/settings/reminders");
}

export async function toggleReminderRuleAction(ruleId: string): Promise<void> {
  const { db } = await settingsCtx();
  const rule = await db.reminderRule.findUnique({ where: { id: ruleId } });
  if (!rule) return;
  await db.reminderRule.update({ where: { id: ruleId }, data: { isActive: !rule.isActive } });
  revalidatePath("/settings/reminders");
}

// --- Campaigns ---------------------------------------------------------------------

export async function createCampaignAction(formData: FormData): Promise<void> {
  const { db, organization } = await campaignsCtx();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(160),
      templateId: z.string().min(1),
      noVisitSinceDays: z.coerce.number().int().min(0).max(3650).default(0),
    })
    .safeParse({
      name: formData.get("name"),
      templateId: formData.get("templateId"),
      noVisitSinceDays: formData.get("noVisitSinceDays") || "0",
    });
  if (!parsed.success) return;

  await db.campaign.create({
    data: {
      organizationId: organization.id,
      name: parsed.data.name,
      templateId: parsed.data.templateId,
      segment: parsed.data.noVisitSinceDays > 0 ? { noVisitSinceDays: parsed.data.noVisitSinceDays } : {},
    },
  });
  revalidatePath("/campaigns");
}

export async function launchCampaignAction(campaignId: string): Promise<void> {
  const { db } = await campaignsCtx();
  await db.campaign.updateMany({
    where: { id: campaignId, status: "DRAFT" },
    data: { status: "SCHEDULED", scheduledAt: new Date() },
  });
  revalidatePath("/campaigns");
}

export async function cancelCampaignAction(campaignId: string): Promise<void> {
  const { db } = await campaignsCtx();
  await db.campaign.updateMany({
    where: { id: campaignId, status: { in: ["DRAFT", "SCHEDULED"] } },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/campaigns");
}
