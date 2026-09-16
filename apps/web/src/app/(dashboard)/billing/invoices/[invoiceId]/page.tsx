import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { orgCurrency } from "@/lib/currency";
import { fullName } from "@/lib/format";
import {
  issueInvoiceAction,
  setInsurancePortionAction,
  updateClaimStatusAction,
  voidInvoiceAction,
} from "@/lib/actions/billing";
import {
  CLAIM_STATUS_BADGES,
  INVOICE_STATUS_BADGES,
  PAYMENT_METHOD_LABELS,
} from "@/components/billing/constants";
import { RecordPaymentForm } from "@/components/billing/record-payment-form";
import { CreateClaimForm } from "./create-claim-form";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { db, organization } = await requireOrgContext();
  const { invoiceId } = await params;
  const currency = orgCurrency(organization);

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      patient: true,
      lines: true,
      payments: { orderBy: { receivedAt: "asc" } },
      claims: { include: { policy: { include: { company: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  const policies = await db.insurancePolicy.findMany({
    where: { patientId: invoice.patientId, isActive: true },
    include: { company: true },
  });

  const due = Math.max(0, invoice.totalFils - invoice.paidFils);
  const payable = !["DRAFT", "VOID"].includes(invoice.status) && due > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {invoice.number ?? "Draft invoice"}
            <span className={`ml-3 rounded-full px-2 py-0.5 align-middle text-xs font-medium ${INVOICE_STATUS_BADGES[invoice.status]}`}>
              {invoice.status.toLowerCase().replace("_", " ")}
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            <Link href={`/patients/${invoice.patient.id}/billing`} className="text-brand-600 hover:underline">
              {fullName(invoice.patient)}
            </Link>
            {invoice.issuedAt && ` · issued ${invoice.issuedAt.toISOString().slice(0, 10)}`}
            {invoice.dueAt && ` · due ${invoice.dueAt.toISOString().slice(0, 10)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.status === "DRAFT" && (
            <form action={issueInvoiceAction.bind(null, invoice.id)}>
              <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Issue invoice
              </button>
            </form>
          )}
          {invoice.number && (
            <Link
              href={`/invoice/${invoice.id}/print`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Print view
            </Link>
          )}
          {invoice.status !== "VOID" && invoice.paidFils === 0 && (
            <form action={voidInvoiceAction.bind(null, invoice.id)}>
              <button type="submit" className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Void
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Tooth</th>
              <th className="px-4 py-2.5 text-right">Qty</th>
              <th className="px-4 py-2.5 text-right">Unit</th>
              <th className="px-4 py-2.5 text-right">VAT</th>
              <th className="px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5">{l.description}</td>
                <td className="px-4 py-2.5">{l.toothFdi ?? "—"}</td>
                <td className="px-4 py-2.5 text-right">{l.qty}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(l.unitPriceFils, currency)}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">
                  {Number(l.vatRate) > 0 ? `${formatMoney(l.vatFils, currency)} (${Number(l.vatRate)}%)` : "0%"}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{formatMoney(l.totalFils, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50 text-sm">
            <tr>
              <td colSpan={4} />
              <td className="px-4 py-1.5 text-right text-gray-500">Subtotal</td>
              <td className="px-4 py-1.5 text-right">{formatMoney(invoice.subtotalFils, currency)}</td>
            </tr>
            <tr>
              <td colSpan={4} />
              <td className="px-4 py-1.5 text-right text-gray-500">VAT</td>
              <td className="px-4 py-1.5 text-right">{formatMoney(invoice.vatFils, currency)}</td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={4} />
              <td className="px-4 py-1.5 text-right">Total</td>
              <td className="px-4 py-1.5 text-right">{formatMoney(invoice.totalFils, currency)}</td>
            </tr>
            <tr>
              <td colSpan={4} />
              <td className="px-4 py-1.5 text-right text-gray-500">Paid</td>
              <td className="px-4 py-1.5 text-right text-green-700">{formatMoney(invoice.paidFils, currency)}</td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={4} />
              <td className="px-4 py-1.5 text-right">Balance due</td>
              <td className={`px-4 py-1.5 text-right ${due > 0 ? "text-red-600" : "text-green-700"}`}>
                {formatMoney(due, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Payments</h2>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex justify-between px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-mono text-xs text-gray-400">{p.receiptNumber}</span>{" "}
                    {PAYMENT_METHOD_LABELS[p.method]}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="font-medium">{formatMoney(p.amountFils, currency)}</span>
                </li>
              ))}
              {invoice.payments.length === 0 && (
                <li className="px-4 py-4 text-sm text-gray-400">No payments yet</li>
              )}
            </ul>
            {payable && (
              <div className="border-t border-gray-100 p-4">
                <RecordPaymentForm patientId={invoice.patientId} fixedInvoiceId={invoice.id} />
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-800">Insurance</h2>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Insurance portion</span>
              <span className="font-medium">{formatMoney(invoice.insurancePortionFils, currency)}</span>
            </div>
            {invoice.status !== "VOID" && (
              <form action={setInsurancePortionAction.bind(null, invoice.id)} className="mt-2 flex gap-2">
                <input
                  name="portion"
                  placeholder='Amount ("40.000") or percent ("80%")'
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button type="submit" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                  Set
                </button>
              </form>
            )}

            <div className="mt-4 border-t border-gray-100 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Claims</div>
              <ul className="mt-2 space-y-3">
                {invoice.claims.map((c) => (
                  <li key={c.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.policy.company.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLAIM_STATUS_BADGES[c.status]}`}>
                        {c.status.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Claimed {formatMoney(c.claimedFils, currency)}
                      {c.approvedFils != null && ` · approved ${formatMoney(c.approvedFils, currency)}`}
                      {c.rejectionReason && ` · ${c.rejectionReason}`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.status === "PREPARING" && (
                        <form action={updateClaimStatusAction.bind(null, c.id, "SUBMITTED")}>
                          <button type="submit" className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700">
                            Mark submitted
                          </button>
                        </form>
                      )}
                      {c.status === "SUBMITTED" && (
                        <>
                          <form action={updateClaimStatusAction.bind(null, c.id, "APPROVED")}>
                            <button type="submit" className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700">
                              Approved
                            </button>
                          </form>
                          <form action={updateClaimStatusAction.bind(null, c.id, "PARTIALLY_APPROVED")} className="flex gap-1">
                            <input name="approved" placeholder="Approved amt" className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs" />
                            <button type="submit" className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600">
                              Partial
                            </button>
                          </form>
                          <form action={updateClaimStatusAction.bind(null, c.id, "REJECTED")} className="flex gap-1">
                            <input name="reason" placeholder="Reason" className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs" />
                            <button type="submit" className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                              Rejected
                            </button>
                          </form>
                        </>
                      )}
                      {["APPROVED", "PARTIALLY_APPROVED"].includes(c.status) && (
                        <form action={updateClaimStatusAction.bind(null, c.id, "PAID")}>
                          <button type="submit" className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700">
                            Insurer paid — record payment
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
                {invoice.claims.length === 0 && (
                  <li className="text-xs text-gray-400">No claims yet</li>
                )}
              </ul>
              {policies.length > 0 && invoice.status !== "VOID" && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <CreateClaimForm
                    invoiceId={invoice.id}
                    policies={policies.map((p) => ({
                      id: p.id,
                      label: `${p.company.name} · ${p.policyNumber} (${Number(p.coveragePercent)}%)`,
                    }))}
                  />
                </div>
              )}
              {policies.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Add an insurance policy on the patient&apos;s billing tab to file claims.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
