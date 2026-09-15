/**
 * Timezone helpers built on Intl — no runtime dependency. Appointments are
 * stored as UTC instants and rendered in the clinic's IANA timezone.
 */

function tzOffsetMs(timeZone: string, utcDate: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(utcDate)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcDate.getTime();
}

/** ("2026-09-15", "14:30", "Asia/Bahrain") -> the UTC instant of that local wall time */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) throw new Error(`Invalid date/time: "${date}" "${time}"`);
  const naive = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  // guess the offset at the naive instant, then refine once (handles DST edges)
  let offset = tzOffsetMs(timeZone, new Date(naive));
  offset = tzOffsetMs(timeZone, new Date(naive - offset));
  return new Date(naive - offset);
}

/** UTC instant -> "YYYY-MM-DD" in the given timezone */
export function dateStrInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** UTC instant -> "HH:MM" (24h) in the given timezone */
export function timeStrInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(/^24/, "00");
}

/** minutes since local midnight for a UTC instant in the given timezone */
export function minutesInTzDay(date: Date, timeZone: string): number {
  const [h, m] = timeStrInTz(date, timeZone).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "YYYY-MM-DD" +/- n days (pure calendar arithmetic) */
export function addDays(date: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid date: "${date}"`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return d.toISOString().slice(0, 10);
}

/** today's "YYYY-MM-DD" in the given timezone */
export function todayInTz(timeZone: string): string {
  return dateStrInTz(new Date(), timeZone);
}

export function formatTime12h(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateLong(date: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(zonedTimeToUtc(date, "12:00", timeZone));
}
