import Link from "next/link";
import { requireOrgContext } from "@/lib/org";
import { age, fileNo, fullName } from "@/lib/format";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { db } = await requireOrgContext();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const numeric = /^\d+$/.test(query) ? Number(query) : null;
  const patients = await db.patient.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              ...(numeric !== null ? [{ fileNumber: numeric }] : []),
            ],
          }
        : {}),
    },
    include: {
      medicalHistories: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Patients</h1>
        <Link
          href="/patients/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New patient
        </Link>
      </div>

      <form method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name, phone, or file number…"
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Alerts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patients.map((p) => {
              const alerts = p.medicalHistories[0]?.alerts ?? [];
              return (
                <tr key={p.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {fileNo(p.fileNumber)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {fullName(p)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{age(p.dob) ?? "—"}</td>
                  <td className="px-4 py-3">
                    {alerts.length > 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {alerts.length} alert{alerts.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {patients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  {query ? `No patients match “${query}”` : "No patients yet — add the first one."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
