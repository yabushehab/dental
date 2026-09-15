"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canTransition,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  zonedTimeToUtc,
  type AppointmentStatusValue,
} from "@dentalos/shared";
import type { OrgContext } from "../org";
import { requireOrgContext } from "../org";

export type AppointmentFormState = { error?: string };

const ACTIVE_STATUSES: AppointmentStatusValue[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_CHAIR",
];

/** Overlap check for provider and (if set) chair. Returns an error string or null. */
async function findConflict(
  db: OrgContext["db"],
  args: {
    providerId: string;
    chairId?: string | null;
    startsAt: Date;
    endsAt: Date;
    excludeId?: string;
  },
): Promise<string | null> {
  const overlap = {
    startsAt: { lt: args.endsAt },
    endsAt: { gt: args.startsAt },
    status: { in: ACTIVE_STATUSES },
    ...(args.excludeId ? { id: { not: args.excludeId } } : {}),
  };
  const providerClash = await db.appointment.findFirst({
    where: { ...overlap, providerId: args.providerId },
    include: { patient: true },
  });
  if (providerClash) {
    return `Provider already has ${providerClash.patient.firstName} ${providerClash.patient.lastName} at that time`;
  }
  if (args.chairId) {
    const chairClash = await db.appointment.findFirst({
      where: { ...overlap, chairId: args.chairId },
    });
    if (chairClash) return "That chair is occupied at the selected time";
  }
  return null;
}

export async function createAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const { db, organization, user } = await requireOrgContext();

  const parsed = createAppointmentSchema.safeParse({
    patientId: formData.get("patientId"),
    providerId: formData.get("providerId"),
    clinicId: formData.get("clinicId"),
    chairId: formData.get("chairId") ?? "",
    typeId: formData.get("typeId") ?? "",
    date: formData.get("date"),
    time: formData.get("time"),
    durationMins: formData.get("durationMins"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  const startsAt = zonedTimeToUtc(input.date, input.time, organization.timezone);
  const endsAt = new Date(startsAt.getTime() + input.durationMins * 60_000);

  const conflict = await findConflict(db, {
    providerId: input.providerId,
    chairId: input.chairId,
    startsAt,
    endsAt,
  });
  if (conflict) return { error: conflict };

  const appointment = await db.appointment.create({
    data: {
      organizationId: organization.id,
      clinicId: input.clinicId,
      patientId: input.patientId,
      providerId: input.providerId,
      chairId: input.chairId ?? null,
      typeId: input.typeId ?? null,
      startsAt,
      endsAt,
      reason: input.reason ?? null,
      createdByUserId: user.id,
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "appointment.created",
      entityType: "Appointment",
      entityId: appointment.id,
      after: { startsAt: startsAt.toISOString(), patientId: input.patientId },
    },
  });

  redirect(`/schedule?date=${input.date}&appt=${appointment.id}`);
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatusValue,
  formData?: FormData,
): Promise<void> {
  const { db, organization, user } = await requireOrgContext();

  const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return;
  if (!canTransition(appointment.status as AppointmentStatusValue, status)) return;

  const cancellationReason =
    status === "CANCELLED" ? String(formData?.get("cancellationReason") ?? "").trim() || null : null;

  await db.appointment.update({
    where: { id: appointmentId },
    data: { status, ...(cancellationReason ? { cancellationReason } : {}) },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: `appointment.${status.toLowerCase()}`,
      entityType: "Appointment",
      entityId: appointmentId,
      before: { status: appointment.status },
      after: { status, cancellationReason },
    },
  });

  revalidatePath("/schedule");
}

export async function rescheduleAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const { db, organization, user } = await requireOrgContext();

  const parsed = rescheduleAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMins: formData.get("durationMins"),
    providerId: formData.get("providerId"),
    chairId: formData.get("chairId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  const appointment = await db.appointment.findUnique({ where: { id: input.appointmentId } });
  if (!appointment) return { error: "Appointment not found" };
  const terminal: AppointmentStatusValue[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];
  if (terminal.includes(appointment.status as AppointmentStatusValue)) {
    return { error: "This appointment can no longer be moved" };
  }

  const startsAt = zonedTimeToUtc(input.date, input.time, organization.timezone);
  const endsAt = new Date(startsAt.getTime() + input.durationMins * 60_000);

  const conflict = await findConflict(db, {
    providerId: input.providerId,
    chairId: input.chairId,
    startsAt,
    endsAt,
    excludeId: appointment.id,
  });
  if (conflict) return { error: conflict };

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      startsAt,
      endsAt,
      providerId: input.providerId,
      chairId: input.chairId ?? null,
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "appointment.rescheduled",
      entityType: "Appointment",
      entityId: appointment.id,
      before: { startsAt: appointment.startsAt.toISOString() },
      after: { startsAt: startsAt.toISOString() },
    },
  });

  redirect(`/schedule?date=${input.date}&appt=${appointment.id}`);
}
