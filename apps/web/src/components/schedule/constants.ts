import type { AppointmentStatusValue } from "@dentalos/shared";

/** Visible day window in the calendar (clinic-local minutes since midnight). */
export const DAY_START_MIN = 8 * 60; // 08:00
export const DAY_END_MIN = 21 * 60; // 21:00
export const PX_PER_MIN = 64 / 60; // 64px per hour
export const SLOT_MINS = 30;

export const STATUS_STYLES: Record<AppointmentStatusValue, string> = {
  SCHEDULED: "border-l-gray-400 bg-white",
  CONFIRMED: "border-l-blue-500 bg-blue-50",
  CHECKED_IN: "border-l-amber-500 bg-amber-50",
  IN_CHAIR: "border-l-purple-500 bg-purple-50",
  COMPLETED: "border-l-green-500 bg-green-50 opacity-70",
  NO_SHOW: "border-l-red-500 bg-red-50 opacity-60",
  CANCELLED: "border-l-gray-300 bg-gray-50 opacity-50 line-through",
};

export const STATUS_BADGES: Record<AppointmentStatusValue, string> = {
  SCHEDULED: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-amber-100 text-amber-800",
  IN_CHAIR: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  NO_SHOW: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export function minutesToTop(min: number): number {
  return (min - DAY_START_MIN) * PX_PER_MIN;
}

export function gridHeight(): number {
  return (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;
}

export function hourLabels(): string[] {
  const labels: string[] = [];
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) {
    const h = Math.floor(m / 60);
    const h12 = ((h + 11) % 12) + 1;
    labels.push(`${h12} ${h < 12 ? "AM" : "PM"}`);
  }
  return labels;
}
