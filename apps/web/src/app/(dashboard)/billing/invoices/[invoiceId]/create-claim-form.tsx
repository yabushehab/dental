"use client";

import { useActionState } from "react";
import { createClaimAction } from "@/lib/actions/billing";

export function CreateClaimForm({
  invoiceId,
  policies,
}: {
  invoiceId: string;
  policies: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(createClaimAction.bind(null, invoiceId), {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 text-sm">
      <div className="min-w-40 flex-1">
        <label htmlFor="cc-policy" className="block text-xs font-medium text-gray-600">Policy</label>
        <select id="cc-policy" name="policyId" required defaultValue="" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
          <option value="" disabled>Select…</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="cc-amount" className="block text-xs font-medium text-gray-600">Claim amount</label>
        <input id="cc-amount" name="claimed" placeholder="insurance portion" className="mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create claim"}
      </button>
      {state.error && <p className="w-full rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
