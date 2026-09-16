"use client";

import { useActionState } from "react";
import { createPolicyAction } from "@/lib/actions/billing";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

export function AddPolicyForm({
  patientId,
  companies,
}: {
  patientId: string;
  companies: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(createPolicyAction.bind(null, patientId), {});

  return (
    <form action={formAction} className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <label htmlFor="ap-company" className="block text-xs font-medium text-gray-600">Company</label>
        <select id="ap-company" name="companyId" required defaultValue="" className={inputClass}>
          <option value="" disabled>Select…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ap-number" className="block text-xs font-medium text-gray-600">Policy number</label>
        <input id="ap-number" name="policyNumber" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="ap-member" className="block text-xs font-medium text-gray-600">Member ID</label>
        <input id="ap-member" name="memberId" className={inputClass} />
      </div>
      <div>
        <label htmlFor="ap-coverage" className="block text-xs font-medium text-gray-600">Coverage %</label>
        <input id="ap-coverage" name="coveragePercent" type="number" min={0} max={100} defaultValue={80} className={inputClass} />
      </div>
      <div>
        <label htmlFor="ap-limit" className="block text-xs font-medium text-gray-600">Annual limit (BHD)</label>
        <input id="ap-limit" name="annualLimit" placeholder="500.000" className={inputClass} />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add policy"}
        </button>
      </div>
      {state.error && (
        <p className="col-span-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
      )}
    </form>
  );
}
