import { redirect } from "next/navigation";
import { orgScoped, prisma } from "@dentalos/db";
import { getCurrentUser } from "./current-user";

/**
 * Context for all tenant-scoped pages and actions: the signed-in user, their
 * organization, and a Prisma client that force-scopes every tenant-model
 * query to that organization.
 */
export async function requireOrgContext() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.membership || !user.organization) redirect("/onboarding");
  return {
    user,
    membership: user.membership,
    organization: user.organization,
    db: orgScoped(prisma, user.organization.id),
  };
}

export type OrgContext = Awaited<ReturnType<typeof requireOrgContext>>;

/** Atomic per-organization sequence (patient file numbers, invoice numbers…). */
export async function nextCounterValue(
  db: OrgContext["db"],
  organizationId: string,
  key: string,
  start: number,
): Promise<number> {
  const counter = await db.counter.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, value: start },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}
