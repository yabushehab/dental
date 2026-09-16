"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { linkContactToPatientAction } from "@/lib/actions/inbox";

export function LinkPatientForm({ contactId }: { contactId: string }) {
  const [state, formAction, pending] = useActionState(
    linkContactToPatientAction.bind(null, contactId),
    {},
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; label: string }>>([]);
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = (await res.json()) as { patients: Array<{ id: string; label: string }> };
          setResults(data.patients);
        }
      } catch {
        setResults([]);
      }
    }, 250);
  }, [query]);

  return (
    <form action={formAction} className="text-xs">
      <input type="hidden" name="patientId" value={picked?.id ?? ""} />
      {picked ? (
        <div className="flex items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-2 py-1.5">
          <span className="truncate font-medium text-brand-800">{picked.label}</span>
          <button type="button" onClick={() => setPicked(null)} className="ml-1 text-brand-600 hover:underline">
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient to link…"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(r);
                      setResults([]);
                    }}
                    className="block w-full px-2 py-1.5 text-left hover:bg-brand-50"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.error && <p className="mt-1 text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !picked}
        className="mt-2 w-full rounded-md bg-brand-600 px-2 py-1.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Linking…" : "Link patient"}
      </button>
    </form>
  );
}
