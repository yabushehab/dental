"use client";

import { useActionState } from "react";
import type { PatientFormState } from "@/lib/actions/patients";

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-gray-700";

export type PatientFormDefaults = Partial<{
  firstName: string;
  lastName: string;
  dob: string;
  sex: string;
  cpr: string;
  phone: string;
  email: string;
  address: string;
  referralSource: string;
  notes: string;
  whatsappOptIn: boolean;
}>;

export function PatientForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: PatientFormState, formData: FormData) => Promise<PatientFormState>;
  defaults?: PatientFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name *
          </label>
          <input id="firstName" name="firstName" required defaultValue={defaults.firstName} className={inputClass} />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name *
          </label>
          <input id="lastName" name="lastName" required defaultValue={defaults.lastName} className={inputClass} />
        </div>
        <div>
          <label htmlFor="dob" className={labelClass}>
            Date of birth
          </label>
          <input id="dob" name="dob" type="date" defaultValue={defaults.dob} className={inputClass} />
        </div>
        <div>
          <label htmlFor="sex" className={labelClass}>
            Sex
          </label>
          <select id="sex" name="sex" defaultValue={defaults.sex ?? ""} className={inputClass}>
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone (WhatsApp)
          </label>
          <input id="phone" name="phone" placeholder="+973…" defaultValue={defaults.phone} className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" defaultValue={defaults.email} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cpr" className={labelClass}>
            CPR / National ID
          </label>
          <input id="cpr" name="cpr" defaultValue={defaults.cpr} className={inputClass} />
        </div>
        <div>
          <label htmlFor="referralSource" className={labelClass}>
            Referral source
          </label>
          <input
            id="referralSource"
            name="referralSource"
            placeholder="Instagram, friend, walk-in…"
            defaultValue={defaults.referralSource}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="address" className={labelClass}>
          Address
        </label>
        <input id="address" name="address" defaultValue={defaults.address} className={inputClass} />
      </div>
      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={defaults.notes} className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="whatsappOptIn"
          defaultChecked={defaults.whatsappOptIn ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        Patient consents to WhatsApp reminders and messages
      </label>
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
