"use server";

import { redirect } from "next/navigation";
import { prisma } from "@dentalos/db";
import { createOrganizationSchema } from "@dentalos/shared";
import { getSessionUserId } from "../session";

export type OnboardingFormState = { error?: string };

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}

export async function createOrganizationAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const parsed = createOrganizationSchema.safeParse({
    organizationName: formData.get("organizationName"),
    clinicName: formData.get("clinicName"),
    country: formData.get("country") || undefined,
    currency: formData.get("currency") || undefined,
    timezone: formData.get("timezone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const existing = await prisma.membership.findFirst({
    where: { userId, isActive: true },
  });
  if (existing) redirect("/");

  const currencyExponent = input.currency === "BHD" ? 3 : 2;

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug: slugify(input.organizationName),
        country: input.country,
        currency: input.currency,
        currencyExponent,
        timezone: input.timezone,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await tx.clinic.create({
      data: { organizationId: org.id, name: input.clinicName },
    });
    const membership = await tx.membership.create({
      data: { userId, organizationId: org.id, role: "OWNER" },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: org.id,
        actorUserId: userId,
        action: "organization.created",
        entityType: "Organization",
        entityId: org.id,
        after: { name: org.name, membershipId: membership.id },
      },
    });
  });

  redirect("/");
}
