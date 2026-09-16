import Link from "next/link";
import { formatMoney, todayInTz, zonedTimeToUtc } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { orgCurrency } from "@/lib/currency";
import { INVOICE_STATUS_BADGES } from "@/components/billing/constants";

const FILTERS = ["ALL", "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID"] as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { db, organization } = await requireOrgContext();
  const { status } = await searchParams;
  const currency = orgCurrency(organization);
  const tz = organization.timezone;

  const filter = FILTERS.includes((status ?? "ALL") as never) ? (status ?? "ALL") : "ALL";
  const dayStart = zonedTimeToUtc(todayInTz(tz), "00:00", tz);

  const [invoices, openInvoices, todaysPayments] = await Promise.all([
    db.invoice.findMany({
      where: filter === "ALL" ? {} : { status: filter as never },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.invoice.findMany({ where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } } }),
    db.payment.findMany({ where: { receivedAt: { gte: dayStart } } }),
  ]);

  const outstanding = openInvoices.reduce((s, i) => s + (i.totalFils - i.paidFils), 0);
  const collectedToday = todaysPayments.reduce((s, p) => s + p.amountFils, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Billing</h1>
        <Link href="/reports" className="text-sm font-medium text-brand-600 hover:underline">
          Reports →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Outstanding</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{formatMoney(outstanding, currency)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Collected today</div>
          <div className="mt-1 text-2xl font-semibold text-green-700">{formatMoney(collectedToday, currency)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Open invoices</div>
          <div className="mt-1 text-2xl font-semibold">{openInvoices.length}</div>
        </div>
      </div>

      <div className="mt-6 flex gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/billing" : `/billing?status=${f}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              filter === f ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "ALL" ? "All" : f.toLowerCase().replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Invoice</th>
              <th className="px-4 py-2.5">Patient</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5 text-right">Due</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((i) => (
              <tr key={i.id} className="hover:bg-brand-50/40">
                <td className="px-4 py-2.5">
                  <Link href={`/billing/invoices/${i.id}`} className="font-medium text-brand-700 hover:underline">
                    {i.number ?? "Draft"}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  {i.patient.firstName} {i.patient.lastName}
                </td>
                <td className="px-4 py-2.5 text-right">{formatMoney(i.totalFils, currency)}</td>
                <td className="px-4 py-2.5 text-right">
                  {formatMoney(Math.max(0, i.totalFils - i.paidFils), currency)}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_BADGES[i.status]}`}>
                    {i.status.toLowerCase().replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                  {(i.issuedAt ?? i.createdAt).toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No invoices{filter !== "ALL" ? ` with status ${filter.toLowerCase()}` : " yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
