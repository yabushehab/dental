"use client";

import { useActionState } from "react";
import type { MedicalHistoryAnswers } from "@dentalos/shared";
import type { PatientFormState } from "@/lib/actions/patients";

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-4 w-4 rounded border-gray-300"
      />
      {label}
    </label>
  );
}

export function MedicalHistoryForm({
  action,
  defaults,
}: {
  action: (prev: PatientFormState, formData: FormData) => Promise<PatientFormState>;
  defaults?: MedicalHistoryAnswers | null;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const a = defaults?.allergies;
  const c = defaults?.conditions;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">Allergies</legend>
        <div className="grid grid-cols-2 gap-2">
          <Check name="allergies.penicillin" label="Penicillin" checked={a?.penicillin} />
          <Check name="allergies.latex" label="Latex" checked={a?.latex} />
          <Check name="allergies.localAnesthetic" label="Local anesthetic" checked={a?.localAnesthetic} />
        </div>
        <div className="mt-3">
          <label htmlFor="allergies.other" className="block text-sm font-medium text-gray-700">
            Other allergies
          </label>
          <input id="allergies.other" name="allergies.other" defaultValue={a?.other} className={inputClass} />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">Medical conditions</legend>
        <div className="grid grid-cols-2 gap-2">
          <Check name="conditions.diabetes" label="Diabetes" checked={c?.diabetes} />
          <Check name="conditions.hypertension" label="Hypertension" checked={c?.hypertension} />
          <Check name="conditions.heartDisease" label="Heart disease" checked={c?.heartDisease} />
          <Check name="conditions.asthma" label="Asthma" checked={c?.asthma} />
          <Check name="conditions.bleedingDisorder" label="Bleeding disorder" checked={c?.bleedingDisorder} />
          <Check name="conditions.hepatitis" label="Hepatitis" checked={c?.hepatitis} />
          <Check name="conditions.epilepsy" label="Epilepsy" checked={c?.epilepsy} />
          <Check name="conditions.pregnancy" label="Pregnancy" checked={c?.pregnancy} />
        </div>
      </fieldset>

      <div>
        <label htmlFor="medications" className="block text-sm font-medium text-gray-700">
          Current medications
        </label>
        <textarea
          id="medications"
          name="medications"
          rows={2}
          defaultValue={defaults?.medications}
          placeholder="e.g. Warfarin 5mg daily"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Anticoagulants (warfarin, aspirin, Plavix…) are flagged automatically.
        </p>
      </div>

      <Check name="smoker" label="Smoker" checked={defaults?.smoker} />

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes} className={inputClass} />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save medical history"}
      </button>
    </form>
  );
}
