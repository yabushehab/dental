import Link from "next/link";
import {
  addDays,
  dateStrInTz,
  formatTime12h,
  minutesInTzDay,
  type AppointmentStatusValue,
} from "@dentalos/shared";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  PX_PER_MIN,
  SLOT_MINS,
  STATUS_STYLES,
  gridHeight,
  hourLabels,
  minutesToTop,
} from "./constants";

export type CalendarAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  providerId: string;
  patient: { firstName: string; lastName: string };
  type: { name: string; color: string } | null;
};

type ProviderOption = { id: string; name: string; color: string };

function AppointmentBlock({
  appt,
  timeZone,
  href,
}: {
  appt: CalendarAppointment;
  timeZone: string;
  href: string;
}) {
  const startMin = Math.max(minutesInTzDay(appt.startsAt, timeZone), DAY_START_MIN);
  const endMin = Math.min(
    startMin + (appt.endsAt.getTime() - appt.startsAt.getTime()) / 60_000,
    DAY_END_MIN,
  );
  const top = minutesToTop(startMin);
  const height = Math.max((endMin - startMin) * PX_PER_MIN, 20);
  const style = STATUS_STYLES[appt.status as AppointmentStatusValue] ?? STATUS_STYLES.SCHEDULED;

  return (
    <Link
      href={href}
      className={`absolute inset-x-0.5 z-10 overflow-hidden rounded border border-gray-200 border-l-4 px-1.5 py-0.5 text-xs shadow-sm hover:shadow ${style}`}
      style={{ top, height }}
    >
      <div className="truncate font-semibold text-gray-900">
        {appt.patient.firstName} {appt.patient.lastName}
      </div>
      <div className="truncate text-[11px] text-gray-500">
        {formatTime12h(appt.startsAt, timeZone)}
        {appt.type ? ` · ${appt.type.name}` : ""}
      </div>
    </Link>
  );
}

function TimeGutter() {
  return (
    <div className="relative w-14 shrink-0 border-r border-gray-100" style={{ height: gridHeight() }}>
      {hourLabels().map((label, i) => (
        <div
          key={label}
          className="absolute right-2 -translate-y-1/2 text-[11px] text-gray-400"
          style={{ top: i * 60 * PX_PER_MIN }}
        >
          {i === 0 ? "" : label}
        </div>
      ))}
    </div>
  );
}

function HourLines() {
  return (
    <>
      {hourLabels().map((label, i) => (
        <div
          key={label}
          className="pointer-events-none absolute inset-x-0 border-t border-gray-100"
          style={{ top: i * 60 * PX_PER_MIN }}
        />
      ))}
    </>
  );
}

function SlotLinks({ date, providerId, view }: { date: string; providerId?: string; view: string }) {
  const slots: number[] = [];
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += SLOT_MINS) slots.push(m);
  return (
    <>
      {slots.map((m) => {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        return (
          <Link
            key={m}
            href={`/schedule?date=${date}&view=${view}&new=1&time=${hh}:${mm}${providerId ? `&providerId=${providerId}` : ""}`}
            className="absolute inset-x-0 hover:bg-brand-50/60"
            style={{ top: minutesToTop(m), height: SLOT_MINS * PX_PER_MIN }}
            aria-label={`New appointment at ${hh}:${mm}`}
          />
        );
      })}
    </>
  );
}

export function DayGrid({
  date,
  timeZone,
  providers,
  appointments,
  view,
}: {
  date: string;
  timeZone: string;
  providers: ProviderOption[];
  appointments: CalendarAppointment[];
  view: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <div className="flex border-b border-gray-200">
        <div className="w-14 shrink-0" />
        {providers.map((p) => (
          <div key={p.id} className="flex-1 border-l border-gray-100 px-3 py-2">
            <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-sm font-medium text-gray-800">{p.name}</span>
          </div>
        ))}
      </div>
      <div className="flex">
        <TimeGutter />
        {providers.map((p) => (
          <div
            key={p.id}
            className="relative flex-1 border-l border-gray-100"
            style={{ height: gridHeight() }}
          >
            <HourLines />
            <SlotLinks date={date} providerId={p.id} view={view} />
            {appointments
              .filter((a) => a.providerId === p.id && dateStrInTz(a.startsAt, timeZone) === date)
              .map((a) => (
                <AppointmentBlock
                  key={a.id}
                  appt={a}
                  timeZone={timeZone}
                  href={`/schedule?date=${date}&view=${view}&appt=${a.id}`}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeekGrid({
  weekStart,
  timeZone,
  appointments,
  selectedDate,
  providerFilter,
}: {
  weekStart: string;
  timeZone: string;
  appointments: CalendarAppointment[];
  selectedDate: string;
  providerFilter?: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const qs = providerFilter ? `&provider=${providerFilter}` : "";

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <div className="flex border-b border-gray-200">
        <div className="w-14 shrink-0" />
        {days.map((d) => (
          <Link
            key={d}
            href={`/schedule?date=${d}&view=day`}
            className={`flex-1 border-l border-gray-100 px-2 py-2 text-center text-sm font-medium hover:bg-brand-50 ${
              d === selectedDate ? "bg-brand-50 text-brand-700" : "text-gray-700"
            }`}
          >
            {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
              new Date(`${d}T12:00:00Z`),
            )}
          </Link>
        ))}
      </div>
      <div className="flex">
        <TimeGutter />
        {days.map((d) => (
          <div key={d} className="relative flex-1 border-l border-gray-100" style={{ height: gridHeight() }}>
            <HourLines />
            <SlotLinks date={d} view="week" />
            {appointments
              .filter((a) => dateStrInTz(a.startsAt, timeZone) === d)
              .map((a) => (
                <AppointmentBlock
                  key={a.id}
                  appt={a}
                  timeZone={timeZone}
                  href={`/schedule?date=${d}&view=week${qs}&appt=${a.id}`}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
