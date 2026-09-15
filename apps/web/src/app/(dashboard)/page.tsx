import Link from "next/link";
import {
  APPOINTMENT_STATUS_LABELS,
  formatTime12h,
  todayInTz,
  zonedTimeToUtc,
  type AppointmentStatusValue,
} from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { STATUS_BADGES } from "@/components/schedule/constants";

export default async function DashboardHome() {
  const { db, organization } = await requireOrgContext();
  const tz = organization.timezone;
  const today = todayInTz(tz);
  const dayStart = zonedTimeToUtc(today, "00:00", tz);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [clinicCount, staffCount, patientCount, todaysAppointments] = await Promise.all([
    db.clinic.count({ where: { isActive: true } }),
    db.membership.count({ where: { isActive: true } }),
    db.patient.count({ where: { deletedAt: null } }),
    db.appointment.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd } },
      include: {
        patient: true,
        type: true,
        provider: { include: { membership: { include: { user: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const active = todaysAppointments.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status));

  const stats = [
    { label: "Appointments today", value: active.length },
    { label: "Patients", value: patientCount },
    { label: "Branches", value: clinicCount },
    { label: "Staff members", value: staffCount },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        {organization.name} · {organization.currency} · {organization.timezone}
        {organization.plan === "TRIAL" && organization.trialEndsAt && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Trial until {organization.trialEndsAt.toISOString().slice(0, 10)}
          </span>
        )}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-3xl rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-sm font-semibold">Today&apos;s appointments</span>
          <Link href="/schedule" className="text-xs font-medium text-brand-600 hover:underline">
            Open schedule →
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {todaysAppointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-20 font-mono text-xs text-gray-500">
                  {formatTime12h(a.startsAt, tz)}
                </span>
                <div>
                  <Link
                    href={`/patients/${a.patient.id}`}
                    className="font-medium text-gray-900 hover:text-brand-700 hover:underline"
                  >
                    {a.patient.firstName} {a.patient.lastName}
                  </Link>
                  <span className="ml-2 text-xs text-gray-500">
                    {a.type?.name ?? ""} · {a.provider.membership.user.name}
                  </span>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[a.status as AppointmentStatusValue]}`}
              >
                {APPOINTMENT_STATUS_LABELS[a.status as AppointmentStatusValue]}
              </span>
            </li>
          ))}
          {todaysAppointments.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">
              No appointments today
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
