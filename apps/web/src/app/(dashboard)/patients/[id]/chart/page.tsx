import { notFound } from "next/navigation";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";
import { ChartClient, type ChartState } from "./chart-client";

export default async function ToothChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireOrgContext();
  const { id } = await params;

  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) notFound();

  const [toothRecords, entries, codes, providers] = await Promise.all([
    db.toothRecord.findMany({ where: { patientId: id } }),
    db.chartEntry.findMany({
      where: { patientId: id },
      include: {
        procedureCode: true,
        provider: { include: { membership: { include: { user: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.procedureCode.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.provider.findMany({ include: { membership: { include: { user: true } } } }),
  ]);

  // project entries onto the chart: last write wins per tooth/surface
  const state: ChartState = {};
  for (const tr of toothRecords) {
    state[tr.toothFdi] = { status: tr.status, surfaces: {}, whole: null };
  }
  for (const e of entries) {
    if (e.toothFdi == null) continue;
    const t = (state[e.toothFdi] ??= { status: "PRESENT", surfaces: {}, whole: null });
    if (e.surfaces.length === 0) t.whole = e.kind;
    for (const s of e.surfaces) t.surfaces[s] = e.kind;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Tooth chart — {fullName(patient)}</h1>
      <div className="mt-4">
        <ChartClient
          patientId={patient.id}
          chartState={state}
          codes={codes.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
          providers={providers.map((p) => ({ id: p.id, name: p.membership.user.name }))}
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-gray-800">Chart history</h2>
      <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Tooth</th>
              <th className="px-4 py-2.5">Surfaces</th>
              <th className="px-4 py-2.5">Kind</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Provider</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...entries].reverse().map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                  {e.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-2.5">{e.toothFdi ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.surfaces.join("") || "—"}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.kind === "FINDING"
                        ? "bg-red-100 text-red-700"
                        : e.kind === "PLANNED"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {e.kind.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {e.procedureCode ? `${e.procedureCode.code} · ` : ""}
                  {e.description}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {e.provider?.membership.user.name ?? "—"}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No chart entries yet — click a tooth above to add the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
