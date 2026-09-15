import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";
export { orgScoped, TENANT_MODELS } from "./tenancy";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Base client — use ONLY for global (non-tenant) data: users, sign-in,
 * organization creation. All tenant data access must go through
 * `orgScoped(prisma, organizationId)`.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
