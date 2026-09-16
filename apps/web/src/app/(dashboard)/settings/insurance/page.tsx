import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "@/lib/rbac";
import { createInsuranceCompanyAction } from "@/lib/actions/billing";

export default async function InsuranceSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);
  const companies = await db.insuranceCompany.findMany({
    include: { _count: { select: { policies: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Insurance companies</h1>
      <p className="mt-1 text-sm text-gray-500">
        Insurers you work with — patient policies are added on each patient&apos;s billing tab.
      </p>

      <div className="mt-6 max-w-2xl rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {companies.map((c) => (
            <li key={c.id} className="px-4 py-3 text-sm">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">
                {c.phone ?? "No phone"} · {c.email ?? "No email"} · {c._count.policies} policies
              </div>
            </li>
          ))}
          {companies.length === 0 && (
            <li className="px-4 py-4 text-sm text-gray-400">No insurance companies yet</li>
          )}
        </ul>
        <form action={createInsuranceCompanyAction} className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
          <input name="name" required placeholder="Company name" className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          <input name="phone" placeholder="Phone" className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          <input name="email" type="email" placeholder="Email" className="w-44 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          <button type="submit" className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
