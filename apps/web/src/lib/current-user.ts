import { cache } from "react";
import { prisma } from "@dentalos/db";
import { getSessionUserId } from "./session";

/**
 * Loads the signed-in user with their active memberships (org included).
 * Cached per request. v1 assumes one organization per user — the first
 * active membership is "current"; an org switcher comes with SaaS hardening.
 */
export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { isActive: true },
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) return null;

  const membership = user.memberships[0] ?? null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    membership,
    organization: membership?.organization ?? null,
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
