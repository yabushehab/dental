"use client";

import { useActionState, useState } from "react";
import { addChartEntryAction, setToothStatusAction } from "@/lib/actions/clinical";

export type ChartState = Record<
  number,
  { status: string; surfaces: Record<string, string>; whole: string | null }
>;

const KIND_FILL: Record<string, string> = {
  FINDING: "#fca5a5", // red-300
  PLANNED: "#93c5fd", // blue-300
  COMPLETED: "#86efac", // green-300
};
const KIND_STROKE: Record<string, string> = {
  FINDING: "#dc2626",
  PLANNED: "#2563eb",
  COMPLETED: "#16a34a",
};

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const CELL = 44; // horizontal pitch
const BOX = 34; // surface box size
const C = 11; // inner box offset
const CS = 12; // inner box size

/** mesial is toward the midline: right side of the box for quadrants 1/4, left for 2/3 */
function sideSurfaces(tooth: number): { left: string; right: string } {
  const q = Math.floor(tooth / 10);
  return q === 1 || q === 4 || q === 5 || q === 8
    ? { left: "D", right: "M" }
    : { left: "M", right: "D" };
}

function surfacesFor(tooth: number, upper: boolean) {
  const { left, right } = sideSurfaces(tooth);
  // buccal faces outward: top of the upper row, bottom of the lower row
  return {
    top: upper ? "B" : "L",
    bottom: upper ? "L" : "B",
    left,
    right,
    center: "O",
  };
}

function Tooth({
  tooth,
  upper,
  state,
  selected,
  selectedSurfaces,
  onToothClick,
  onSurfaceClick,
}: {
  tooth: number;
  upper: boolean;
  state?: ChartState[number];
  selected: boolean;
  selectedSurfaces: string[];
  onToothClick: (t: number) => void;
  onSurfaceClick: (t: number, s: string) => void;
}) {
  const map = surfacesFor(tooth, upper);
  const missing = state && ["MISSING", "EXTRACTED"].includes(state.status);
  const implant = state?.status === "IMPLANT";

  const fill = (s: string) => {
    if (selected && selectedSurfaces.includes(s)) return "#c7d2fe"; // indigo-200 selection
    const kind = state?.surfaces[s];
    return kind ? (KIND_FILL[kind] ?? "#fff") : "#fff";
  };

  const regions: Array<{ s: string; d: string }> = [
    // trapezoids around the center square + center itself (classic odontogram)
    { s: map.top, d: `M0,0 L${BOX},0 L${C + CS},${C} L${C},${C} Z` },
    { s: map.bottom, d: `M0,${BOX} L${BOX},${BOX} L${C + CS},${C + CS} L${C},${C + CS} Z` },
    { s: map.left, d: `M0,0 L${C},${C} L${C},${C + CS} L0,${BOX} Z` },
    { s: map.right, d: `M${BOX},0 L${BOX},${BOX} L${C + CS},${C + CS} L${C + CS},${C} Z` },
    { s: map.center, d: `M${C},${C} h${CS} v${CS} h-${CS} Z` },
  ];

  const numberY = upper ? -6 : BOX + 14;
  const wholeKind = state?.whole;

  return (
    <g>
      <text
        x={BOX / 2}
        y={numberY}
        textAnchor="middle"
        className="cursor-pointer select-none"
        fontSize={11}
        fontWeight={selected ? 700 : 500}
        fill={selected ? "#1d4ed8" : "#6b7280"}
        onClick={() => onToothClick(tooth)}
      >
        {tooth}
      </text>
      {wholeKind && !missing && (
        <rect
          x={-2.5}
          y={-2.5}
          width={BOX + 5}
          height={BOX + 5}
          fill="none"
          stroke={KIND_STROKE[wholeKind] ?? "#6b7280"}
          strokeWidth={1.5}
          rx={4}
        />
      )}
      {missing ? (
        <g className="cursor-pointer" onClick={() => onToothClick(tooth)}>
          <rect width={BOX} height={BOX} fill="#f3f4f6" stroke="#d1d5db" rx={3} />
          <line x1={4} y1={4} x2={BOX - 4} y2={BOX - 4} stroke="#9ca3af" strokeWidth={2} />
          <line x1={BOX - 4} y1={4} x2={4} y2={BOX - 4} stroke="#9ca3af" strokeWidth={2} />
        </g>
      ) : (
        <>
          {regions.map((r) => (
            <path
              key={r.s}
              d={r.d}
              fill={fill(r.s)}
              stroke={selected && selectedSurfaces.includes(r.s) ? "#4338ca" : "#d1d5db"}
              strokeWidth={selected && selectedSurfaces.includes(r.s) ? 1.5 : 0.75}
              className="cursor-pointer"
              onClick={() => onSurfaceClick(tooth, r.s)}
            >
              <title>{`${tooth} ${r.s}`}</title>
            </path>
          ))}
          {implant && (
            <text x={BOX / 2} y={BOX / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#374151" pointerEvents="none">
              IMP
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function ChartClient({
  patientId,
  chartState,
  codes,
  providers,
}: {
  patientId: string;
  chartState: ChartState;
  codes: Array<{ id: string; code: string; name: string }>;
  providers: Array<{ id: string; name: string }>;
}) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);

  const entryAction = addChartEntryAction.bind(null, patientId);
  const statusAction = setToothStatusAction.bind(null, patientId);
  const [entryState, entryFormAction, entryPending] = useActionState(entryAction, {});
  const [statusState, statusFormAction, statusPending] = useActionState(statusAction, {});

  const onToothClick = (t: number) => {
    setSelectedTooth((prev) => (prev === t ? null : t));
    setSelectedSurfaces([]);
  };
  const onSurfaceClick = (t: number, s: string) => {
    if (selectedTooth !== t) {
      setSelectedTooth(t);
      setSelectedSurfaces([s]);
    } else {
      setSelectedSurfaces((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    }
  };

  const width = 16 * CELL + 12;

  return (
    <div className="flex flex-wrap gap-6">
      <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-4">
        <svg viewBox={`0 0 ${width} 200`} className="w-full max-w-4xl">
          {UPPER.map((t, i) => (
            <g key={t} transform={`translate(${6 + i * CELL}, 22)`}>
              <Tooth
                tooth={t}
                upper
                state={chartState[t]}
                selected={selectedTooth === t}
                selectedSurfaces={selectedSurfaces}
                onToothClick={onToothClick}
                onSurfaceClick={onSurfaceClick}
              />
            </g>
          ))}
          <line x1={6} y1={100} x2={width - 6} y2={100} stroke="#e5e7eb" strokeDasharray="4 4" />
          {LOWER.map((t, i) => (
            <g key={t} transform={`translate(${6 + i * CELL}, 124)`}>
              <Tooth
                tooth={t}
                upper={false}
                state={chartState[t]}
                selected={selectedTooth === t}
                selectedSurfaces={selectedSurfaces}
                onToothClick={onToothClick}
                onSurfaceClick={onSurfaceClick}
              />
            </g>
          ))}
        </svg>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: KIND_FILL.FINDING }} /> Finding
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: KIND_FILL.PLANNED }} /> Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: KIND_FILL.COMPLETED }} /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-3 w-3 items-center justify-center rounded-sm bg-gray-100 text-[9px] text-gray-500">✕</span>
            Missing / extracted
          </span>
        </div>
      </div>

      <div className="w-80 shrink-0 space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-800">
            {selectedTooth
              ? `Tooth ${selectedTooth}${selectedSurfaces.length ? ` · ${selectedSurfaces.join("")}` : ""}`
              : "Select a tooth or surfaces"}
          </div>
          <form action={entryFormAction} className="mt-3 space-y-3 text-sm">
            <input type="hidden" name="toothFdi" value={selectedTooth ?? ""} />
            <input type="hidden" name="surfaces" value={selectedSurfaces.join(",")} />
            <div>
              <label htmlFor="ce-kind" className="block text-xs font-medium text-gray-600">Kind</label>
              <select id="ce-kind" name="kind" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5">
                <option value="FINDING">Finding</option>
                <option value="PLANNED">Planned</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="ce-code" className="block text-xs font-medium text-gray-600">Procedure (optional)</label>
              <select id="ce-code" name="procedureCodeId" defaultValue="" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5">
                <option value="">—</option>
                {codes.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ce-desc" className="block text-xs font-medium text-gray-600">Description</label>
              <input id="ce-desc" name="description" placeholder="e.g. Deep caries" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5" />
            </div>
            <div>
              <label htmlFor="ce-provider" className="block text-xs font-medium text-gray-600">Provider</label>
              <select id="ce-provider" name="providerId" defaultValue="" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5">
                <option value="">(me)</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {entryState.error && (
              <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{entryState.error}</p>
            )}
            <button
              type="submit"
              disabled={entryPending}
              className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {entryPending ? "Saving…" : "Add chart entry"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-800">Tooth status</div>
          <form action={statusFormAction} className="mt-3 flex gap-2 text-sm">
            <input type="hidden" name="toothFdi" value={selectedTooth ?? ""} />
            <select name="status" className="flex-1 rounded-md border border-gray-300 px-2 py-1.5" defaultValue="MISSING">
              <option value="PRESENT">Present</option>
              <option value="MISSING">Missing</option>
              <option value="EXTRACTED">Extracted</option>
              <option value="IMPLANT">Implant</option>
              <option value="UNERUPTED">Unerupted</option>
            </select>
            <button
              type="submit"
              disabled={statusPending || !selectedTooth}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Set
            </button>
          </form>
          {statusState.error && (
            <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{statusState.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
