import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "@/lib/rbac";
import { createReminderRuleAction, toggleReminderRuleAction } from "@/lib/actions/crm-admin";

export default async function RemindersSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);

  const [rules, templates, recentLogs] = await Promise.all([
    db.reminderRule.findMany({ include: { template: true }, orderBy: { createdAt: "asc" } }),
    db.messageTemplate.findMany({ where: { approvalStatus: "APPROVED" }, orderBy: { name: "asc" } }),
    db.reminderLog.findMany({ orderBy: { sentAt: "desc" }, take: 15 }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Appointment reminders</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        The worker checks every minute and sends the WhatsApp template when an appointment enters
        the window. Patients replying CONFIRM are moved to confirmed automatically.
      </p>

      <div className="mt-5 max-w-3xl rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className={r.isActive ? "" : "opacity-50"}>
                <span className="font-medium">{r.offsetHours}h before appointment</span>
                <span className="ml-2 text-xs text-gray-500">
                  template: {r.template?.name ?? "plain text"} ·{" "}
                  {r.requiresConfirmation ? "asks for confirmation" : "info only"}
                </span>
              </div>
              <form action={toggleReminderRuleAction.bind(null, r.id)}>
                <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                  {r.isActive ? "Disable" : "Enable"}
                </button>
              </form>
            </li>
          ))}
          {rules.length === 0 && <li className="px-4 py-4 text-sm text-gray-400">No rules yet</li>}
        </ul>
        <form action={createReminderRuleAction} className="flex flex-wrap items-end gap-3 border-t border-gray-100 px-4 py-3 text-sm">
          <div>
            <label htmlFor="rr-hours" className="block text-xs font-medium text-gray-600">Hours before</label>
            <input id="rr-hours" name="offsetHours" type="number" min={1} max={336} defaultValue={24} className="mt-1 w-24 rounded-md border border-gray-300 px-2 py-1.5" />
          </div>
          <div>
            <label htmlFor="rr-template" className="block text-xs font-medium text-gray-600">Template</label>
            <select id="rr-template" name="templateId" defaultValue="" className="mt-1 rounded-md border border-gray-300 px-2 py-1.5">
              <option value="">Plain text</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs text-gray-600">
            <input type="checkbox" name="requiresConfirmation" defaultChecked className="h-4 w-4 rounded border-gray-300" />
            Ask patient to confirm
          </label>
          <button type="submit" className="rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700">
            Add rule
          </button>
        </form>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-gray-800">Recent reminder activity</h2>
      <div className="mt-2 max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentLogs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">
                  {l.sentAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.status === "SENT"
                        ? "bg-green-100 text-green-700"
                        : l.status === "FAILED"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {l.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{l.detail ?? "—"}</td>
              </tr>
            ))}
            {recentLogs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">
                  No reminders sent yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
