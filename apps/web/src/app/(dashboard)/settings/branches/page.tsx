import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "@/lib/rbac";
import { createClinicAction } from "@/lib/actions/settings";

export default async function BranchesSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);
  const clinics = await db.clinic.findMany({
    include: { _count: { select: { chairs: true, appointments: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Branches</h1>
      <p className="mt-1 text-sm text-gray-500">Locations of {organization.name}.</p>

      <div className="mt-6 max-w-2xl rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {clinics.map((c) => (
            <li key={c.id} className="px-4 py-3 text-sm">
              <div className="font-medium text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-500">
                {c.address ?? "No address"} · {c.phone ?? "No phone"} · {c._count.chairs} chairs ·{" "}
                {c._count.appointments} appointments
              </div>
            </li>
          ))}
        </ul>
        <form action={createClinicAction} className="space-y-2 border-t border-gray-100 px-4 py-3">
          <div className="flex gap-2">
            <input
              name="name"
              required
              placeholder="Branch name"
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            <input
              name="phone"
              placeholder="+973…"
              className="w-36 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <input
              name="address"
              placeholder="Address"
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add branch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
