"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emptyToUndefined } from "@dentalos/shared";
import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "../rbac";

async function settingsDb() {
  const { organization, user } = await requirePermission("settings:manage");
  return { db: orgScoped(prisma, organization.id), organization, user };
}

// --- Chairs ---------------------------------------------------------------

export async function createChairAction(formData: FormData): Promise<void> {
  const { db, organization } = await settingsDb();
  const parsed = z
    .object({ clinicId: z.string().min(1), name: z.string().trim().min(1).max(60) })
    .safeParse({ clinicId: formData.get("clinicId"), name: formData.get("name") });
  if (!parsed.success) return;

  const clinic = await db.clinic.findUnique({ where: { id: parsed.data.clinicId } });
  if (!clinic) return;

  await db.chair.create({
    data: { organizationId: organization.id, clinicId: clinic.id, name: parsed.data.name },
  });
  revalidatePath("/settings/chairs");
}

export async function toggleChairAction(chairId: string): Promise<void> {
  const { db } = await settingsDb();
  const chair = await db.chair.findUnique({ where: { id: chairId } });
  if (!chair) return;
  await db.chair.update({ where: { id: chairId }, data: { isActive: !chair.isActive } });
  revalidatePath("/settings/chairs");
}

// --- Appointment types ------------------------------------------------------

export async function createAppointmentTypeAction(formData: FormData): Promise<void> {
  const { db, organization } = await settingsDb();
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      defaultMins: z.coerce.number().int().min(5).max(480),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    })
    .safeParse({
      name: formData.get("name"),
      defaultMins: formData.get("defaultMins"),
      color: formData.get("color"),
    });
  if (!parsed.success) return;

  await db.appointmentType.create({ data: { organizationId: organization.id, ...parsed.data } });
  revalidatePath("/settings/appointment-types");
}

export async function toggleAppointmentTypeAction(typeId: string): Promise<void> {
  const { db } = await settingsDb();
  const type = await db.appointmentType.findUnique({ where: { id: typeId } });
  if (!type) return;
  await db.appointmentType.update({ where: { id: typeId }, data: { isActive: !type.isActive } });
  revalidatePath("/settings/appointment-types");
}

// --- Branches ---------------------------------------------------------------

export async function createClinicAction(formData: FormData): Promise<void> {
  const { db, organization } = await settingsDb();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      phone: emptyToUndefined(z.string().trim().max(30)),
      address: emptyToUndefined(z.string().trim().max(300)),
    })
    .safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
    });
  if (!parsed.success) return;

  await db.clinic.create({
    data: {
      organizationId: organization.id,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
    },
  });
  revalidatePath("/settings/branches");
}
