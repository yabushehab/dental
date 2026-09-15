import Link from "next/link";
import { addDays, formatDateLong, todayInTz } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { DayGrid, WeekGrid } from "@/components/schedule/grids";
import { AppointmentPanel } from "@/components/schedule/appointment-panel";
import { NewAppointmentModal } from "@/components/schedule/new-appointment-modal";
import { zonedTimeToUtc } from "@dentalos/shared";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    view?: string;
    provider?: string;
    appt?: string;
    new?: string;
    time?: string;
    providerId?: string;
  }>;
}) {
  const { db, organization } = await requireOrgContext();
  const sp = await searchParams;
  const tz = organization.timezone;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayInTz(tz);
  const view = sp.view === "week" ? "week" : "day";

  const clinic = await db.clinic.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  const providers = await db.provider.findMany({
    include: { membership: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });
  const chairs = clinic
    ? await db.chair.findMany({ where: { clinicId: clinic.id, isActive: true }, orderBy: { name: "asc" } })
    : [];
  const types = await db.appointmentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  const rangeStartDate = view === "day" ? date : addDays(date, -(((new Date(date + "T00:00:00Z").getUTCDay() + 1) % 7))); // week starts Saturday
  const rangeDays = view === "day" ? 1 : 7;
  const rangeStart = zonedTimeToUtc(rangeStartDate, "00:00", tz);
  const rangeEnd = zonedTimeToUtc(addDays(rangeStartDate, rangeDays - 1), "23:59", tz);

  const appointments = await db.appointment.findMany({
    where: {
      startsAt: { gte: rangeStart, lte: rangeEnd },
      ...(view === "week" && sp.provider ? { providerId: sp.provider } : {}),
    },
    include: {
      patient: true,
      type: true,
      provider: { include: { membership: { include: { user: true } } } },
      chair: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const selected = sp.appt ? appointments.find((a) => a.id === sp.appt) ?? null : null;

  const providerOptions = providers.map((p) => ({
    id: p.id,
    name: p.membership.user.name,
    color: p.color,
  }));

  const baseQS = (d: string, v: string) => `/schedule?date=${d}&view=${v}${sp.provider ? `&provider=${sp.provider}` : ""}`;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Schedule</h1>
            <span className="text-sm text-gray-500">{formatDateLong(date, tz)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={baseQS(addDays(date, view === "day" ? -1 : -7), view)} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm hover:bg-gray-50">←</Link>
            <Link href={baseQS(todayInTz(tz), view)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Today</Link>
            <Link href={baseQS(addDays(date, view === "day" ? 1 : 7), view)} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm hover:bg-gray-50">→</Link>
            <div className="ml-2 flex overflow-hidden rounded-md border border-gray-300">
              <Link href={baseQS(date, "day")} className={`px-3 py-1.5 text-sm font-medium ${view === "day" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Day</Link>
              <Link href={baseQS(date, "week")} className={`px-3 py-1.5 text-sm font-medium ${view === "week" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Week</Link>
            </div>
            <Link
              href={`/schedule?date=${date}&view=${view}&new=1`}
              className="ml-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + Appointment
            </Link>
          </div>
        </div>

        {view === "week" && (
          <div className="mt-3">
            <form method="get" className="flex items-center gap-2 text-sm">
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="view" value="week" />
              <label htmlFor="provider" className="text-gray-500">Provider:</label>
              <select id="provider" name="provider" defaultValue={sp.provider ?? ""} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
                <option value="">All providers</option>
                {providerOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm hover:bg-gray-50">Apply</button>
            </form>
          </div>
        )}

        <div className="mt-4">
          {providers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
              No providers yet — staff with clinical roles appear here.
            </div>
          ) : view === "day" ? (
            <DayGrid
              date={date}
              timeZone={tz}
              providers={providerOptions}
              appointments={appointments}
              view={view}
            />
          ) : (
            <WeekGrid
              weekStart={rangeStartDate}
              timeZone={tz}
              appointments={appointments}
              selectedDate={date}
              providerFilter={sp.provider}
            />
          )}
        </div>
      </div>

      {selected && (
        <AppointmentPanel
          appointment={selected}
          timeZone={tz}
          date={date}
          view={view}
          providers={providerOptions}
          chairs={chairs.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}

      {sp.new === "1" && clinic && (
        <NewAppointmentModal
          clinicId={clinic.id}
          date={date}
          time={sp.time}
          providerId={sp.providerId}
          providers={providerOptions}
          chairs={chairs.map((c) => ({ id: c.id, name: c.name }))}
          types={types.map((t) => ({ id: t.id, name: t.name, defaultMins: t.defaultMins }))}
          closeHref={`/schedule?date=${date}&view=${view}`}
        />
      )}
    </div>
  );
}
