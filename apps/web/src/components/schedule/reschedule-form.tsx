"use client";

import { useActionState } from "react";
import { rescheduleAppointmentAction } from "@/lib/actions/appointments";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

export function RescheduleForm({
  appointmentId,
  defaults,
  providers,
  chairs,
}: {
  appointmentId: string;
  defaults: { date: string; time: string; durationMins: number; providerId: string; chairId: string };
  providers: Array<{ id: string; name: string }>;
  chairs: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(rescheduleAppointmentAction, {});

  return (
    <form action={formAction} className="space-y-2 text-sm">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600" htmlFor="rs-date">Date</label>
          <input id="rs-date" name="date" type="date" defaultValue={defaults.date} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600" htmlFor="rs-time">Time</label>
          <input id="rs-time" name="time" type="time" step={300} defaultValue={defaults.time} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600" htmlFor="rs-duration">Minutes</label>
          <input id="rs-duration" name="durationMins" type="number" min={5} max={480} step={5} defaultValue={defaults.durationMins} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600" htmlFor="rs-provider">Provider</label>
          <select id="rs-provider" name="providerId" defaultValue={defaults.providerId} className={inputClass}>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600" htmlFor="rs-chair">Chair</label>
          <select id="rs-chair" name="chairId" defaultValue={defaults.chairId} className={inputClass}>
            <option value="">No chair</option>
            {chairs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      {state.error && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Moving…" : "Move appointment"}
      </button>
    </form>
  );
}
