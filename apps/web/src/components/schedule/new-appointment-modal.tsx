"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createAppointmentAction } from "@/lib/actions/appointments";

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

type Option = { id: string; name: string };

export function NewAppointmentModal({
  clinicId,
  date,
  time,
  providerId,
  providers,
  chairs,
  types,
  closeHref,
}: {
  clinicId: string;
  date: string;
  time?: string;
  providerId?: string;
  providers: Array<Option & { color: string }>;
  chairs: Option[];
  types: Array<Option & { defaultMins: number }>;
  closeHref: string;
}) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, {});

  // patient autocomplete
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; label: string }>>([]);
  const [patient, setPatient] = useState<{ id: string; label: string } | null>(null);
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

  const [durationMins, setDurationMins] = useState(30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold">New appointment</h2>
          <Link href={closeHref} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </Link>
        </div>
        <form action={formAction} className="space-y-4 px-5 py-4">
          <input type="hidden" name="clinicId" value={clinicId} />
          <input type="hidden" name="patientId" value={patient?.id ?? ""} />

          <div className="relative">
            <label htmlFor="patient-search" className="block text-sm font-medium text-gray-700">
              Patient *
            </label>
            {patient ? (
              <div className="mt-1 flex items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
                <span className="font-medium text-brand-800">{patient.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPatient(null);
                    setQuery("");
                  }}
                  className="text-xs text-brand-600 hover:underline"
                >
                  change
                </button>
              </div>
            ) : (
              <>
                <input
                  id="patient-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, phone, or file number…"
                  autoComplete="off"
                  className={inputClass}
                />
                {results.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPatient(r);
                            setResults([]);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                        >
                          {r.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="na-provider" className="block text-sm font-medium text-gray-700">
                Provider *
              </label>
              <select id="na-provider" name="providerId" defaultValue={providerId ?? providers[0]?.id ?? ""} className={inputClass}>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="na-type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="na-type"
                name="typeId"
                defaultValue=""
                className={inputClass}
                onChange={(e) => {
                  const t = types.find((x) => x.id === e.target.value);
                  if (t) setDurationMins(t.defaultMins);
                }}
              >
                <option value="">—</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="na-date" className="block text-sm font-medium text-gray-700">
                Date *
              </label>
              <input id="na-date" name="date" type="date" defaultValue={date} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="na-time" className="block text-sm font-medium text-gray-700">
                Time *
              </label>
              <input id="na-time" name="time" type="time" step={300} defaultValue={time ?? "09:00"} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="na-duration" className="block text-sm font-medium text-gray-700">
                Duration (mins) *
              </label>
              <input
                id="na-duration"
                name="durationMins"
                type="number"
                min={5}
                max={480}
                step={5}
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="na-chair" className="block text-sm font-medium text-gray-700">
                Chair
              </label>
              <select id="na-chair" name="chairId" defaultValue="" className={inputClass}>
                <option value="">—</option>
                {chairs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="na-reason" className="block text-sm font-medium text-gray-700">
              Reason / note
            </label>
            <input id="na-reason" name="reason" className={inputClass} />
          </div>

          {state.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          <div className="flex justify-end gap-2 pb-1">
            <Link
              href={closeHref}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending || !patient}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Booking…" : "Book appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
