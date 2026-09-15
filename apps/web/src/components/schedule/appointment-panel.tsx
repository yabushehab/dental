import Link from "next/link";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TRANSITIONS,
  formatTime12h,
  dateStrInTz,
  timeStrInTz,
  type AppointmentStatusValue,
} from "@dentalos/shared";
import { updateAppointmentStatusAction } from "@/lib/actions/appointments";
import { STATUS_BADGES } from "./constants";
import { RescheduleForm } from "./reschedule-form";

type PanelAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  reason: string | null;
  cancellationReason: string | null;
  providerId: string;
  chairId: string | null;
  patient: { id: string; firstName: string; lastName: string; phone: string | null; fileNumber: number };
  provider: { membership: { user: { name: string } } };
  chair: { name: string } | null;
  type: { name: string } | null;
};

const ACTION_LABELS: Partial<Record<AppointmentStatusValue, string>> = {
  CONFIRMED: "Confirm",
  CHECKED_IN: "Check in",
  IN_CHAIR: "To chair",
  COMPLETED: "Complete",
  NO_SHOW: "No-show",
};

export function AppointmentPanel({
  appointment,
  timeZone,
  date,
  view,
  providers,
  chairs,
}: {
  appointment: PanelAppointment;
  timeZone: string;
  date: string;
  view: string;
  providers: Array<{ id: string; name: string }>;
  chairs: Array<{ id: string; name: string }>;
}) {
  const status = appointment.status as AppointmentStatusValue;
  const nextStatuses = APPOINTMENT_TRANSITIONS[status].filter((s) => s !== "CANCELLED");
  const canCancel = APPOINTMENT_TRANSITIONS[status].includes("CANCELLED");
  const durationMins = Math.round(
    (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000,
  );
  const movable = !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status);

  return (
    <aside className="w-80 shrink-0">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <Link
              href={`/patients/${appointment.patient.id}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {appointment.patient.firstName} {appointment.patient.lastName}
            </Link>
            <div className="text-xs text-gray-500">
              #{appointment.patient.fileNumber}
              {appointment.patient.phone ? ` · ${appointment.patient.phone}` : ""}
            </div>
          </div>
          <Link
            href={`/schedule?date=${date}&view=${view}`}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </Link>
        </div>

        <div className="space-y-2 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[status]}`}>
              {APPOINTMENT_STATUS_LABELS[status]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">When</span>
            <span className="font-medium">
              {dateStrInTz(appointment.startsAt, timeZone)} ·{" "}
              {formatTime12h(appointment.startsAt, timeZone)}–{formatTime12h(appointment.endsAt, timeZone)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Provider</span>
            <span className="font-medium">{appointment.provider.membership.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Chair</span>
            <span className="font-medium">{appointment.chair?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="font-medium">{appointment.type?.name ?? "—"}</span>
          </div>
          {appointment.reason && (
            <div>
              <span className="text-gray-500">Reason: </span>
              {appointment.reason}
            </div>
          )}
          {appointment.cancellationReason && (
            <div className="text-red-600">
              <span className="text-gray-500">Cancelled: </span>
              {appointment.cancellationReason}
            </div>
          )}
        </div>

        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
            {nextStatuses.map((s) => (
              <form key={s} action={updateAppointmentStatusAction.bind(null, appointment.id, s)}>
                <button
                  type="submit"
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    s === "NO_SHOW"
                      ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {ACTION_LABELS[s] ?? APPOINTMENT_STATUS_LABELS[s]}
                </button>
              </form>
            ))}
          </div>
        )}

        {movable && (
          <details className="border-t border-gray-100 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">Reschedule</summary>
            <div className="mt-3">
              <RescheduleForm
                appointmentId={appointment.id}
                defaults={{
                  date: dateStrInTz(appointment.startsAt, timeZone),
                  time: timeStrInTz(appointment.startsAt, timeZone),
                  durationMins,
                  providerId: appointment.providerId,
                  chairId: appointment.chairId ?? "",
                }}
                providers={providers}
                chairs={chairs}
              />
            </div>
          </details>
        )}

        {canCancel && (
          <details className="border-t border-gray-100 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-red-600">Cancel appointment</summary>
            <form
              action={updateAppointmentStatusAction.bind(null, appointment.id, "CANCELLED")}
              className="mt-3 space-y-2"
            >
              <input
                name="cancellationReason"
                placeholder="Reason (optional)"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Cancel appointment
              </button>
            </form>
          </details>
        )}
      </div>
    </aside>
  );
}
