import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "@/lib/rbac";
import { createChairAction, toggleChairAction } from "@/lib/actions/settings";

export default async function ChairsSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);

  const clinics = await db.clinic.findMany({
    where: { isActive: true },
    include: { chairs: { orderBy: { name: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Chairs</h1>
      <p className="mt-1 text-sm text-gray-500">Treatment chairs / operatories per branch.</p>

      <div className="mt-6 space-y-6">
        {clinics.map((clinic) => (
          <div key={clinic.id} className="max-w-2xl rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold">
              {clinic.name}
            </div>
            <ul className="divide-y divide-gray-100">
              {clinic.chairs.map((chair) => (
                <li key={chair.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className={chair.isActive ? "" : "text-gray-400 line-through"}>
                    {chair.name}
                  </span>
                  <form action={toggleChairAction.bind(null, chair.id)}>
                    <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                      {chair.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </li>
              ))}
              {clinic.chairs.length === 0 && (
                <li className="px-4 py-4 text-sm text-gray-400">No chairs yet</li>
              )}
            </ul>
            <form action={createChairAction} className="flex gap-2 border-t border-gray-100 px-4 py-3">
              <input type="hidden" name="clinicId" value={clinic.id} />
              <input
                name="name"
                required
                placeholder="e.g. Chair 4"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Add chair
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
