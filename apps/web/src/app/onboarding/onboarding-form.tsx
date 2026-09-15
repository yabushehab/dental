"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/lib/actions/onboarding";

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
          Dental center name
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          placeholder="Smile Dental Center"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700">
          First branch name
        </label>
        <input
          id="clinicName"
          name="clinicName"
          type="text"
          required
          placeholder="Main Branch — Manama"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Country
          </label>
          <select id="country" name="country" defaultValue="BH" className={inputClass}>
            <option value="BH">Bahrain</option>
            <option value="SA">Saudi Arabia</option>
            <option value="AE">United Arab Emirates</option>
            <option value="KW">Kuwait</option>
            <option value="QA">Qatar</option>
            <option value="OM">Oman</option>
          </select>
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <select id="currency" name="currency" defaultValue="BHD" className={inputClass}>
            <option value="BHD">BHD — Bahraini dinar</option>
            <option value="SAR">SAR — Saudi riyal</option>
            <option value="AED">AED — UAE dirham</option>
            <option value="KWD">KWD — Kuwaiti dinar</option>
            <option value="QAR">QAR — Qatari riyal</option>
            <option value="OMR">OMR — Omani rial</option>
          </select>
        </div>
      </div>
      <input type="hidden" name="timezone" value="Asia/Bahrain" />
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create my clinic"}
      </button>
    </form>
  );
}
