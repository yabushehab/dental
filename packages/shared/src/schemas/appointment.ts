import { z } from "zod";
import { emptyToUndefined } from "./patient";

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_CHAIR",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
] as const;
export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

/** Front-desk state machine: which statuses each status may move to. */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatusValue, AppointmentStatusValue[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "NO_SHOW", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "NO_SHOW", "CANCELLED"],
  CHECKED_IN: ["IN_CHAIR", "CANCELLED"],
  IN_CHAIR: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatusValue, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_CHAIR: "In chair",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

export function canTransition(from: AppointmentStatusValue, to: AppointmentStatusValue): boolean {
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  providerId: z.string().min(1, "Select a provider"),
  clinicId: z.string().min(1),
  chairId: emptyToUndefined(z.string().min(1)),
  typeId: emptyToUndefined(z.string().min(1)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  durationMins: z.coerce.number().int().min(5).max(8 * 60),
  reason: emptyToUndefined(z.string().trim().max(300)),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  durationMins: z.coerce.number().int().min(5).max(8 * 60),
  providerId: z.string().min(1),
  chairId: emptyToUndefined(z.string().min(1)),
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
