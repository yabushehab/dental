"use client";

import { useActionState } from "react";
import { amendNoteAction, createNoteAction } from "@/lib/actions/clinical";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

export function NewNoteForm({
  patientId,
  providers,
}: {
  patientId: string;
  providers: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(createNoteAction.bind(null, patientId), {});

  return (
    <form action={formAction} className="mt-3 space-y-3 text-sm">
      <div>
        <label htmlFor="nn-provider" className="block text-xs font-medium text-gray-600">Provider</label>
        <select id="nn-provider" name="providerId" defaultValue="" className={inputClass}>
          <option value="">(me)</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {(
        [
          ["subjective", "Subjective — what the patient reports"],
          ["objective", "Objective — findings, tests, radiographs"],
          ["assessment", "Assessment — diagnosis"],
          ["plan", "Plan — treatment performed / next steps"],
        ] as const
      ).map(([name, label]) => (
        <div key={name}>
          <label htmlFor={`nn-${name}`} className="block text-xs font-medium text-gray-600">
            {label}
          </label>
          <textarea id={`nn-${name}`} name={name} rows={2} className={inputClass} />
        </div>
      ))}
      {state.error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}

export function AmendmentForm({ noteId }: { noteId: string }) {
  const [state, formAction, pending] = useActionState(amendNoteAction.bind(null, noteId), {});
  return (
    <form action={formAction} className="flex gap-2">
      <input
        name="text"
        required
        placeholder="Add amendment (the signed note itself cannot be edited)…"
        className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Amend
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
