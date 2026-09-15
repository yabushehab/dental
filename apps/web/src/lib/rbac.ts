import { redirect } from "next/navigation";
import { can, type Permission, type Role } from "@dentalos/shared";
import { getCurrentUser } from "./current-user";

/**
 * Server-side guard for pages and actions. Redirects to sign-in when there is
 * no session, to onboarding when there is no organization, and to the
 * dashboard when the role lacks the permission.
 */
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.membership || !user.organization) redirect("/onboarding");
  if (!can(user.membership.role as Role, permission)) redirect("/");
  return {
    user,
    membership: user.membership,
    organization: user.organization,
  };
}
