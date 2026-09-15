import type { PrismaClient } from "@prisma/client";

/**
 * Models that carry an `organizationId` column. Every new tenant-owned model
 * MUST be added here (there is a seed-time assertion + RLS as backstops).
 */
export const TENANT_MODELS = new Set<string>([
  "Clinic",
  "Membership",
  "Provider",
  "AuditEvent",
  "Patient",
  "MedicalHistory",
  "Document",
  "Chair",
  "AppointmentType",
  "Appointment",
  "Counter",
]);

/**
 * Returns a client that transparently scopes every query on tenant models to
 * one organization:
 *  - reads/updates/deletes get `organizationId` merged into `where`
 *    (extended-where-unique lets us add it to findUnique/update/delete too)
 *  - creates get `organizationId` forced into `data`, overriding whatever the
 *    caller passed.
 *
 * Application code for tenant data must always run through this — the base
 * `prisma` export is reserved for global data (users, sign-in, org creation).
 */
export function orgScoped(client: PrismaClient, organizationId: string) {
  return client.$extends({
    name: `orgScoped:${organizationId}`,
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (!TENANT_MODELS.has(model)) return query(args);

          switch (operation) {
            case "findUnique":
            case "findUniqueOrThrow":
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy":
            case "update":
            case "updateMany":
            case "delete":
            case "deleteMany":
              args.where = { ...(args.where ?? {}), organizationId };
              break;
            case "create":
              args.data = { ...(args.data ?? {}), organizationId };
              break;
            case "createMany":
            case "createManyAndReturn": {
              const rows = Array.isArray(args.data) ? args.data : [args.data];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              args.data = rows.map((row: any) => ({ ...row, organizationId }));
              break;
            }
            case "upsert":
              args.where = { ...(args.where ?? {}), organizationId };
              args.create = { ...(args.create ?? {}), organizationId };
              break;
            default:
              // raw/unknown operations are not tenant-safe through this path
              throw new Error(
                `orgScoped: unsupported operation "${operation}" on tenant model "${model}"`,
              );
          }
          return query(args);
        },
      },
    },
  });
}

export type OrgScopedClient = ReturnType<typeof orgScoped>;
