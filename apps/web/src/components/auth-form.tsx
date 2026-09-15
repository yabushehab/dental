"use client";

import { useActionState } from "react";

type Field = {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  defaultValue?: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  fields: Field[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block text-sm font-medium text-gray-700">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            placeholder={f.placeholder}
            defaultValue={f.defaultValue}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      ))}
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
