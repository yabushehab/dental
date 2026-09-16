import { addDays, formatDateLong, formatMoney, todayInTz, zonedTimeToUtc } from "@dentalos/shared";
import Link from "next/link";
import { requireOrgContext } from "@/lib/org";
import { orgCurrency } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS } from "@/components/billing/constants";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { db, organization } = await requireOrgContext();
  const sp = await searchParams;
  const currency = orgCurrency(organization);
  const tz = organization.timezone;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayInTz(tz);
  const dayStart = zonedTimeToUtc(date, "00:00", tz);
  const dayEnd = zonedTimeToUtc(addDays(date, 1), "00:00", tz);

  const [payments, issued, completedAppts, openInvoices] = await Promise.all([
    db.payment.findMany({
      where: { receivedAt: { gte: dayStart, lt: dayEnd } },
      include: { patient: true },
      orderBy: { receivedAt: "asc" },
    }),
    db.invoice.findMany({ where: { issuedAt: { gte: dayStart, lt: dayEnd } } }),
    db.appointment.count({
      where: { startsAt: { gte: dayStart, lt: dayEnd }, status: "COMPLETED" },
    }),
    db.invoice.findMany({ where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } } }),
  ]);

  const byMethod = new Map<string, number>();
  for (const p of payments) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amountFils);
  }
  const collected = payments.reduce((s, p) => s + p.amountFils, 0);
  const issuedTotal = issued.reduce((s, i) => s + i.totalFils, 0);
  const outstanding = openInvoices.reduce((s, i) => s + (i.totalFils - i.paidFils), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Daily reconciliation</h1>
          <p className="mt-1 text-sm text-gray-500">{formatDateLong(date, tz)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/reports?date=${addDays(date, -1)}`} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm hover:bg-gray-50">←</Link>
          <Link href="/reports" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Today</Link>
          <Link href={`/reports?date=${addDays(date, 1)}`} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm hover:bg-gray-50">→</Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Collected</div>
          <div className="mt-1 text-2xl font-semibold text-green-700">{formatMoney(collected, currency)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Invoiced</div>
          <div className="mt-1 text-2xl font-semibold">{formatMoney(issuedTotal, currency)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Completed visits</div>
          <div className="mt-1 text-2xl font-semibold">{completedAppts}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Total outstanding</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{formatMoney(outstanding, currency)}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Collections by method</h2>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {[...byMethod.entries()].map(([method, amount]) => (
                <li key={method} className="flex justify-between px-4 py-2.5 text-sm">
                  <span>{PAYMENT_METHOD_LABELS[method] ?? method}</span>
                  <span className="font-medium">{formatMoney(amount, currency)}</span>
                </li>
              ))}
              <li className="flex justify-between bg-gray-50 px-4 py-2.5 text-sm font-semibold">
                <span>Total</span>
                <span>{formatMoney(collected, currency)}</span>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-800">Receipts</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Receipt</th>
                  <th className="px-4 py-2.5">Patient</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.receiptNumber}</td>
                    <td className="px-4 py-2.5">{p.patient.firstName} {p.patient.lastName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMoney(p.amountFils, currency)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                      No payments on this day
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
