/** Mirror of the Prisma Role enum — kept in sync manually. */
export const ROLES = [
  "OWNER",
  "ADMIN",
  "DENTIST",
  "HYGIENIST",
  "ASSISTANT",
  "RECEPTIONIST",
  "ACCOUNTANT",
] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // organization administration
  "org:manage",
  "org:billing", // our subscription — OWNER only
  "staff:manage",
  "settings:manage",
  "audit:read",
  // patients
  "patients:read",
  "patients:write",
  // scheduling
  "schedule:read",
  "schedule:write",
  // clinical
  "clinical:read",
  "clinical:write",
  "clinical:sign",
  // financial
  "billing:read",
  "billing:write",
  "payments:take",
  "reports:read",
  // CRM
  "inbox:read",
  "inbox:write",
  "campaigns:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== "org:billing"),
  DENTIST: [
    "patients:read",
    "patients:write",
    "schedule:read",
    "schedule:write",
    "clinical:read",
    "clinical:write",
    "clinical:sign",
    "billing:read",
    "inbox:read",
    "inbox:write",
  ],
  HYGIENIST: [
    "patients:read",
    "patients:write",
    "schedule:read",
    "schedule:write",
    "clinical:read",
    "clinical:write",
  ],
  ASSISTANT: ["patients:read", "schedule:read", "clinical:read", "clinical:write"],
  RECEPTIONIST: [
    "patients:read",
    "patients:write",
    "schedule:read",
    "schedule:write",
    "billing:read",
    "payments:take",
    "inbox:read",
    "inbox:write",
  ],
  ACCOUNTANT: ["patients:read", "billing:read", "billing:write", "payments:take", "reports:read"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
