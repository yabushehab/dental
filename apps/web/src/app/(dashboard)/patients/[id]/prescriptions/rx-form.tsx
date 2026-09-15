"use client";

import { useActionState, useState } from "react";
import { createPrescriptionAction } from "@/lib/actions/clinical";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

export function NewPrescriptionForm({
  patientId,
  providers,
}: {
  patientId: string;
  providers: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createPrescriptionAction.bind(null, patientId),
    {},
  );
  const [rows, setRows] = useState(1);

  return (
    <form action={formAction} className="mt-3 space-y-3 text-sm">
      <div>
        <label htmlFor="rx-provider" className="block text-xs font-medium text-gray-600">Prescriber</label>
        <select id="rx-provider" name="providerId" defaultValue="" className={inputClass}>
          <option value="">(me)</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2 sm:grid-cols-4">
          <input name="drug" placeholder="Drug & strength *" required={i === 0} className={inputClass} />
          <input name="dose" placeholder="Dose (1 tablet)" className={inputClass} />
          <input name="frequency" placeholder="Frequency (TDS)" className={inputClass} />
          <input name="duration" placeholder="Duration (5 days)" className={inputClass} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((r) => r + 1)}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        + Add medication
      </button>

      <div>
        <label htmlFor="rx-notes" className="block text-xs font-medium text-gray-600">Notes for the patient</label>
        <input id="rx-notes" name="notes" className={inputClass} />
      </div>

      {state.error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Issuing…" : "Issue & open print view"}
      </button>
    </form>
  );
}
