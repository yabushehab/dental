import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { orgCurrency } from "@/lib/currency";
import { fullName } from "@/lib/format";
import { INVOICE_STATUS_BADGES, PAYMENT_METHOD_LABELS } from "@/components/billing/constants";
import { RecordPaymentForm } from "@/components/billing/record-payment-form";
import { AddPolicyForm } from "@/components/billing/add-policy-form";

export default async function PatientBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { db, organization } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) notFound();
  const currency = orgCurrency(organization);

  const [invoices, payments, policies, companies] = await Promise.all([
    db.invoice.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" } }),
    db.payment.findMany({
      where: { patientId: id },
      include: { invoice: true },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
    db.insurancePolicy.findMany({
      where: { patientId: id, isActive: true },
      include: { company: true },
    }),
    db.insuranceCompany.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const billed = invoices.filter((i) => !["DRAFT", "VOID"].includes(i.status));
  const invoicedTotal = billed.reduce((s, i) => s + i.totalFils, 0);
  const paidOnInvoices = billed.reduce((s, i) => s + Math.min(i.paidFils, i.totalFils), 0);
  const outstanding = invoicedTotal - paidOnInvoices;
  const credit = payments.filter((p) => !p.invoiceId).reduce((s, p) => s + p.amountFils, 0);

  const stats = [
    { label: "Invoiced", value: formatMoney(invoicedTotal, currency) },
    { label: "Paid", value: formatMoney(paidOnInvoices, currency) },
    { label: "Outstanding", value: formatMoney(outstanding, currency), warn: outstanding > 0 },
    { label: "Unallocated credit", value: formatMoney(credit, currency) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Billing — {fullName(patient)}</h1>
        <Link
          href={`/patients/${id}/billing/new`}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New invoice
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className={`mt-1 text-lg font-semibold ${s.warn ? "text-red-600" : ""}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Invoices</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Number</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Paid</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/billing/invoices/${i.id}`} className="font-medium text-brand-700 hover:underline">
                        {i.number ?? `Draft · ${i.createdAt.toISOString().slice(0, 10)}`}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(i.totalFils, currency)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(i.paidFils, currency)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_BADGES[i.status]}`}>
                        {i.status.toLowerCase().replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No invoices yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mt-6 text-sm font-semibold text-gray-800">Record a payment</h2>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
            <RecordPaymentForm
              patientId={patient.id}
              invoices={billed
                .filter((i) => i.paidFils < i.totalFils)
                .map((i) => ({ id: i.id, label: `${i.number} — due ${formatMoney(i.totalFils - i.paidFils, currency)}` }))}
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-800">Payments</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Receipt</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.receiptNumber}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMoney(p.amountFils, currency)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{PAYMENT_METHOD_LABELS[p.method]}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.invoice?.number ?? "credit"}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No payments yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mt-6 text-sm font-semibold text-gray-800">Insurance policies</h2>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {policies.map((p) => (
                <li key={p.id} className="px-4 py-3 text-sm">
                  <div className="font-medium">{p.company.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.policyNumber}
                    {p.memberId ? ` · member ${p.memberId}` : ""} · covers {Number(p.coveragePercent)}%
                    {p.annualLimitFils ? ` · limit ${formatMoney(p.annualLimitFils, currency)}/yr` : ""}
                  </div>
                </li>
              ))}
              {policies.length === 0 && (
                <li className="px-4 py-4 text-sm text-gray-400">No insurance on file</li>
              )}
            </ul>
            <div className="border-t border-gray-100 p-4">
              <AddPolicyForm
                patientId={patient.id}
                companies={companies.map((c) => ({ id: c.id, name: c.name }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
