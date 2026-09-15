import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";
import { createPlanAction } from "@/lib/actions/clinical";
import { PLAN_STATUS_BADGES } from "./status-badges";

export default async function PlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { db, organization } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) notFound();

  const plans = await db.treatmentPlan.findMany({
    where: { patientId: id },
    include: { items: true, provider: { include: { membership: { include: { user: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const currency = { code: organization.currency, exponent: organization.currencyExponent };

  return (
    <div>
      <h1 className="text-xl font-semibold">Treatment plans — {fullName(patient)}</h1>

      <form action={createPlanAction.bind(null, patient.id)} className="mt-4 flex max-w-md gap-2">
        <input
          name="title"
          required
          placeholder="New plan title, e.g. Full mouth rehabilitation"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Create plan
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Provider</th>
              <th className="px-4 py-2.5">Items</th>
              <th className="px-4 py-2.5">Total</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((p) => {
              const activeItems = p.items.filter((i) => i.status !== "CANCELLED");
              const total = activeItems.reduce(
                (sum, i) => sum + i.priceFils + Math.round((i.priceFils * Number(i.vatRate)) / 100),
                0,
              );
              return (
                <tr key={p.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-2.5">
                    <Link href={`/patients/${id}/plans/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {p.provider?.membership.user.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">{activeItems.length}</td>
                  <td className="px-4 py-2.5 font-medium">{formatMoney(total, currency)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STATUS_BADGES[p.status] ?? ""}`}>
                      {p.status.toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                    {p.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              );
            })}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No treatment plans yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
