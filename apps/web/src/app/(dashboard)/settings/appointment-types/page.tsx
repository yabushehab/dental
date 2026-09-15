import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "@/lib/rbac";
import {
  createAppointmentTypeAction,
  toggleAppointmentTypeAction,
} from "@/lib/actions/settings";

export default async function AppointmentTypesSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);
  const types = await db.appointmentType.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-xl font-semibold">Appointment types</h1>
      <p className="mt-1 text-sm text-gray-500">
        Visit types with default duration and calendar color.
      </p>

      <div className="mt-6 max-w-2xl rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {types.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className={t.isActive ? "" : "text-gray-400 line-through"}>{t.name}</span>
                <span className="text-xs text-gray-400">{t.defaultMins} min</span>
              </span>
              <form action={toggleAppointmentTypeAction.bind(null, t.id)}>
                <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                  {t.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
            </li>
          ))}
          {types.length === 0 && <li className="px-4 py-4 text-sm text-gray-400">No types yet</li>}
        </ul>
        <form action={createAppointmentTypeAction} className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
          <input
            name="name"
            required
            placeholder="e.g. Implant consult"
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            name="defaultMins"
            type="number"
            min={5}
            max={480}
            step={5}
            defaultValue={30}
            required
            className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input name="color" type="color" defaultValue="#3b82f6" className="h-9 w-12 rounded-md border border-gray-300" />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Add type
          </button>
        </form>
      </div>
    </div>
  );
}
