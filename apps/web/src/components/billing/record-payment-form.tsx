"use client";

import { useActionState } from "react";
import { recordPaymentAction } from "@/lib/actions/billing";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

export function RecordPaymentForm({
  patientId,
  invoices,
  fixedInvoiceId,
}: {
  patientId: string;
  invoices?: Array<{ id: string; label: string }>;
  fixedInvoiceId?: string;
}) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, {});

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <input type="hidden" name="patientId" value={patientId} />
      {fixedInvoiceId ? (
        <input type="hidden" name="invoiceId" value={fixedInvoiceId} />
      ) : (
        <div className="col-span-2">
          <label htmlFor="pm-invoice" className="block text-xs font-medium text-gray-600">Apply to invoice</label>
          <select id="pm-invoice" name="invoiceId" defaultValue="" className={inputClass}>
            <option value="">Patient credit (no invoice)</option>
            {(invoices ?? []).map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="pm-amount" className="block text-xs font-medium text-gray-600">Amount (BHD)</label>
        <input id="pm-amount" name="amount" required placeholder="25.000" className={inputClass} />
      </div>
      <div>
        <label htmlFor="pm-method" className="block text-xs font-medium text-gray-600">Method</label>
        <select id="pm-method" name="method" defaultValue="CASH" className={inputClass}>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="BENEFIT">Benefit</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
        </select>
      </div>
      <div className="col-span-2">
        <label htmlFor="pm-ref" className="block text-xs font-medium text-gray-600">Reference</label>
        <input id="pm-ref" name="reference" placeholder="Card slip / transfer ref" className={inputClass} />
      </div>
      <div className="col-span-2 flex items-end justify-end gap-3 sm:col-span-2">
        {state.error && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Recording…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
