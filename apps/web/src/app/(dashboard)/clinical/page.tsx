import Link from "next/link";
import { requireOrgContext } from "@/lib/org";

/** Clinical launcher: recent chart activity across the organization. */
export default async function ClinicalPage() {
  const { db } = await requireOrgContext();

  const recent = await db.chartEntry.findMany({
    include: {
      patient: true,
      provider: { include: { membership: { include: { user: true } } } },
      procedureCode: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Clinical</h1>
      <p className="mt-1 text-sm text-gray-500">
        Charting, treatment plans, notes, and prescriptions live on each patient&apos;s profile —
        open a patient from <Link href="/patients" className="text-brand-600 hover:underline">Patients</Link>.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-gray-800">Recent chart activity</h2>
      <div className="mt-2 max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <Link
                  href={`/patients/${e.patient.id}/chart`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {e.patient.firstName} {e.patient.lastName}
                </Link>
                <span className="ml-2 text-gray-600">
                  {e.toothFdi ? `Tooth ${e.toothFdi}` : "General"} — {e.description}
                </span>
              </div>
              <div className="flex items-center gap-3">
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
                <span className="font-mono text-xs text-gray-400">
                  {e.createdAt.toISOString().slice(0, 10)}
                </span>
              </div>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">No chart activity yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}
