"use client";

import { useActionState, useState } from "react";
import { addPlanItemAction } from "@/lib/actions/clinical";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

export function AddPlanItemForm({
  planId,
  codes,
  currencyExponent,
}: {
  planId: string;
  codes: Array<{ id: string; code: string; name: string; defaultPriceFils: number; vatRate: number }>;
  currencyExponent: number;
}) {
  const [state, formAction, pending] = useActionState(addPlanItemAction.bind(null, planId), {});
  const [price, setPrice] = useState("");

  const formatFils = (fils: number) => {
    const per = 10 ** currencyExponent;
    return `${Math.floor(fils / per)}.${String(fils % per).padStart(currencyExponent, "0")}`;
  };

  return (
    <form action={formAction} className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div className="col-span-2">
        <label htmlFor="pi-code" className="block text-xs font-medium text-gray-600">Procedure *</label>
        <select
          id="pi-code"
          name="procedureCodeId"
          required
          defaultValue=""
          className={inputClass}
          onChange={(e) => {
            const c = codes.find((x) => x.id === e.target.value);
            if (c) setPrice(formatFils(c.defaultPriceFils));
          }}
        >
          <option value="" disabled>Select…</option>
          {codes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.name} ({formatFils(c.defaultPriceFils)}{c.vatRate > 0 ? ` +${c.vatRate}% VAT` : ""})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="pi-tooth" className="block text-xs font-medium text-gray-600">Tooth (FDI)</label>
        <input id="pi-tooth" name="toothFdi" type="number" min={11} max={85} placeholder="36" className={inputClass} />
      </div>
      <div>
        <label htmlFor="pi-phase" className="block text-xs font-medium text-gray-600">Phase</label>
        <input id="pi-phase" name="phase" type="number" min={1} max={20} defaultValue={1} className={inputClass} />
      </div>
      <div>
        <label htmlFor="pi-surfaces" className="block text-xs font-medium text-gray-600">Surfaces</label>
        <input id="pi-surfaces" name="surfaces" placeholder="M,O" className={inputClass} />
      </div>
      <div>
        <label htmlFor="pi-price" className="block text-xs font-medium text-gray-600">Price (BHD)</label>
        <input
          id="pi-price"
          name="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="catalog price"
          className={inputClass}
        />
      </div>
      <div className="col-span-2 flex items-end sm:col-span-4">
        {state.error && (
          <p className="mr-3 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add to plan"}
        </button>
      </div>
    </form>
  );
}
