"use client";

import { useActionState } from "react";
import { uploadDocumentAction } from "@/lib/actions/documents";

export function DocumentUploadForm({ patientId }: { patientId: string }) {
  const action = uploadDocumentAction.bind(null, patientId);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-gray-700">
          File (max 15 MB)
        </label>
        <input id="file" name="file" type="file" required className="mt-1 block text-sm" />
      </div>
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="type"
          name="type"
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="XRAY">X-ray</option>
          <option value="PHOTO">Photo</option>
          <option value="LAB">Lab</option>
          <option value="CONSENT">Consent</option>
          <option value="INSURANCE_CARD">Insurance card</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
