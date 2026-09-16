"use client";

import { useActionState, useState } from "react";
import { createInvoiceAction } from "@/lib/actions/billing";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

export function NewInvoiceForm({
  patientId,
  items,
}: {
  patientId: string;
  items: Array<{ id: string; label: string; price: string; vatRate: number }>;
}) {
  const [state, formAction, pending] = useActionState(createInvoiceAction.bind(null, patientId), {});
  const [customRows, setCustomRows] = useState(items.length === 0 ? 1 : 0);

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-800">Completed treatments not yet billed</div>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">
            Nothing pending — completed treatment plan items appear here.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {items.map((it) => (
              <li key={it.id}>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="itemId"
                    value={it.id}
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="flex-1">{it.label}</span>
                  <span className="font-medium">
                    {it.price}
                    {it.vatRate > 0 && <span className="text-xs text-gray-400"> +{it.vatRate}%</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-800">Custom lines</div>
        {Array.from({ length: customRows }, (_, i) => (
          <div key={i} className="mt-2 grid grid-cols-6 gap-2">
            <input name="lineDesc" placeholder="Description" className={`${inputClass} col-span-3`} />
            <input name="lineQty" type="number" min={1} max={99} defaultValue={1} className={inputClass} />
            <input name="linePrice" placeholder="Price (BHD)" className={inputClass} />
            <input name="lineVat" type="number" min={0} max={100} step="0.01" defaultValue={0} placeholder="VAT %" className={inputClass} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCustomRows((r) => r + 1)}
          className="mt-2 text-xs font-medium text-brand-600 hover:underline"
        >
          + Add line
        </button>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create draft invoice"}
      </button>
    </form>
  );
}
