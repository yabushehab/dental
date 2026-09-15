import { notFound } from "next/navigation";
import { formatMoney, vatOn } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";
import {
  cancelPlanItemAction,
  completePlanItemAction,
  updatePlanStatusAction,
} from "@/lib/actions/clinical";
import { PLAN_STATUS_BADGES } from "../status-badges";
import { AddPlanItemForm } from "./add-item-form";

const NEXT_ACTIONS: Record<string, Array<{ status: string; label: string }>> = {
  DRAFT: [{ status: "PROPOSED", label: "Present to patient" }],
  PROPOSED: [
    { status: "ACCEPTED", label: "Patient accepted" },
    { status: "DRAFT", label: "Back to draft" },
  ],
  ACCEPTED: [{ status: "IN_PROGRESS", label: "Start treatment" }],
  IN_PROGRESS: [],
};

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { db, organization } = await requireOrgContext();
  const { id, planId } = await params;

  const plan = await db.treatmentPlan.findUnique({
    where: { id: planId },
    include: {
      patient: true,
      provider: { include: { membership: { include: { user: true } } } },
      items: { include: { procedureCode: true }, orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!plan || plan.patientId !== id) notFound();

  const codes = await db.procedureCode.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const currency = { code: organization.currency, exponent: organization.currencyExponent };
  const activeItems = plan.items.filter((i) => i.status !== "CANCELLED");
  const subtotal = activeItems.reduce((s, i) => s + i.priceFils, 0);
  const vat = activeItems.reduce((s, i) => s + vatOn(i.priceFils, Number(i.vatRate)), 0);
  const open = !["COMPLETED", "CANCELLED"].includes(plan.status);
  const workable = ["ACCEPTED", "IN_PROGRESS"].includes(plan.status);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {plan.title}{" "}
            <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-xs font-medium ${PLAN_STATUS_BADGES[plan.status]}`}>
              {plan.status.toLowerCase().replace("_", " ")}
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {fullName(plan.patient)} · {plan.provider?.membership.user.name ?? "No provider"}
          </p>
        </div>
        <div className="flex gap-2">
          {(NEXT_ACTIONS[plan.status] ?? []).map((a) => (
            <form key={a.status} action={updatePlanStatusAction.bind(null, plan.id, a.status)}>
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {a.label}
              </button>
            </form>
          ))}
          {open && (
            <form action={updatePlanStatusAction.bind(null, plan.id, "CANCELLED")}>
              <button
                type="submit"
                className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Cancel plan
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Phase</th>
              <th className="px-4 py-2.5">Procedure</th>
              <th className="px-4 py-2.5">Tooth</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">VAT</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plan.items.map((i) => (
              <tr key={i.id} className={i.status === "CANCELLED" ? "opacity-50" : ""}>
                <td className="px-4 py-2.5">{i.phase}</td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-gray-400">{i.procedureCode.code}</span>{" "}
                  {i.procedureCode.name}
                </td>
                <td className="px-4 py-2.5">
                  {i.toothFdi ?? "—"}
                  {i.surfaces.length > 0 && (
                    <span className="ml-1 font-mono text-xs text-gray-400">{i.surfaces.join("")}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{formatMoney(i.priceFils, currency)}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">
                  {Number(i.vatRate) > 0 ? formatMoney(vatOn(i.priceFils, Number(i.vatRate)), currency) : "0%"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      i.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : i.status === "CANCELLED"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {i.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {i.status === "PENDING" && (
                    <div className="flex justify-end gap-2">
                      {workable && (
                        <form action={completePlanItemAction.bind(null, i.id)}>
                          <button type="submit" className="text-xs font-medium text-green-700 hover:underline">
                            Mark done
                          </button>
                        </form>
                      )}
                      <form action={cancelPlanItemAction.bind(null, i.id)}>
                        <button type="submit" className="text-xs font-medium text-gray-500 hover:underline">
                          Remove
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {plan.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No items yet — add procedures below.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
            <tr>
              <td colSpan={3} className="px-4 py-2.5 text-right text-gray-500">Subtotal</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(subtotal, currency)}</td>
              <td className="px-4 py-2.5 text-right text-gray-500">{formatMoney(vat, currency)}</td>
              <td colSpan={2} className="px-4 py-2.5">
                <span className="text-gray-500">Total </span>
                {formatMoney(subtotal + vat, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {open && (
        <div className="mt-5 max-w-2xl rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-800">Add procedure</div>
          <AddPlanItemForm
            planId={plan.id}
            codes={codes.map((c) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              defaultPriceFils: c.defaultPriceFils,
              vatRate: Number(c.vatRate),
            }))}
            currencyExponent={organization.currencyExponent}
          />
        </div>
      )}
    </div>
  );
}
