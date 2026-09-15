import { orgScoped, prisma } from "@dentalos/db";
import { formatAmount } from "@dentalos/shared";
import { requirePermission } from "@/lib/rbac";
import {
  createProcedureCodeAction,
  toggleProcedureCodeAction,
  updateProcedurePriceAction,
} from "@/lib/actions/procedures";

const CATEGORIES = [
  "DIAGNOSTIC", "PREVENTIVE", "RESTORATIVE", "ENDO", "PERIO",
  "PROSTHO", "ORTHO", "SURGERY", "IMPLANT", "COSMETIC",
] as const;

export default async function ProceduresSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);
  const codes = await db.procedureCode.findMany({
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });
  const currency = { code: organization.currency, exponent: organization.currencyExponent };

  return (
    <div>
      <h1 className="text-xl font-semibold">Procedure catalog</h1>
      <p className="mt-1 text-sm text-gray-500">
        Prices in {organization.currency}. VAT 0% = zero-rated healthcare; cosmetic procedures
        carry the standard rate.
      </p>

      <div className="mt-5 max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Price / VAT</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {codes.map((c) => (
              <tr key={c.id} className={c.isActive ? "" : "opacity-50"}>
                <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{c.category}</td>
                <td className="px-4 py-2">
                  <form action={updateProcedurePriceAction.bind(null, c.id)} className="flex items-center gap-1.5">
                    <input
                      name="price"
                      defaultValue={formatAmount(c.defaultPriceFils, currency)}
                      className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <input
                      name="vatRate"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      defaultValue={Number(c.vatRate)}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-gray-400">%</span>
                    <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleProcedureCodeAction.bind(null, c.id)}>
                    <button type="submit" className="text-xs font-medium text-gray-500 hover:underline">
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={createProcedureCodeAction} className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
          <input name="code" required placeholder="Code" className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <input name="name" required placeholder="Procedure name" className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <select name="category" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" defaultValue="RESTORATIVE">
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input name="price" placeholder="Price (25.000)" className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <input name="vatRate" type="number" min={0} max={100} step="0.01" defaultValue={0} className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <button type="submit" className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            Add procedure
          </button>
        </form>
      </div>
    </div>
  );
}
