import { requireOrgContext } from "@/lib/org";
import {
  cancelCampaignAction,
  createCampaignAction,
  launchCampaignAction,
} from "@/lib/actions/crm-admin";

const STATUS_BADGES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-amber-100 text-amber-800",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function CampaignsPage() {
  const { db } = await requireOrgContext();

  const [campaigns, templates] = await Promise.all([
    db.campaign.findMany({ include: { template: true }, orderBy: { createdAt: "desc" } }),
    db.messageTemplate.findMany({ where: { approvalStatus: "APPROVED" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Campaigns</h1>
      <p className="mt-1 text-sm text-gray-500">
        WhatsApp template broadcasts to opted-in patients — recalls, reactivation, announcements.
      </p>

      <div className="mt-5 max-w-3xl rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-800">New campaign</div>
        <form action={createCampaignAction} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <div className="min-w-52 flex-1">
            <label htmlFor="cp-name" className="block text-xs font-medium text-gray-600">Name</label>
            <input id="cp-name" name="name" required placeholder="6-month recall — September" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label htmlFor="cp-template" className="block text-xs font-medium text-gray-600">Template</label>
            <select id="cp-template" name="templateId" required defaultValue="" className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              <option value="" disabled>Select…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cp-days" className="block text-xs font-medium text-gray-600">No visit in (days, 0 = everyone)</label>
            <input id="cp-days" name="noVisitSinceDays" type="number" min={0} max={3650} defaultValue={0} className="mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Create draft
          </button>
        </form>
      </div>

      <div className="mt-5 max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Campaign</th>
              <th className="px-4 py-2.5">Template</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Results</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((c) => {
              const stats = (c.stats ?? {}) as { targeted?: number; sent?: number; skipped?: number };
              return (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{c.template.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[c.status]}`}>
                      {c.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {c.status === "DONE"
                      ? `${stats.sent ?? 0} sent / ${stats.targeted ?? 0} targeted${stats.skipped ? ` (${stats.skipped} skipped)` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      {c.status === "DRAFT" && (
                        <form action={launchCampaignAction.bind(null, c.id)}>
                          <button type="submit" className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700">
                            Send now
                          </button>
                        </form>
                      )}
                      {["DRAFT", "SCHEDULED"].includes(c.status) && (
                        <form action={cancelCampaignAction.bind(null, c.id)}>
                          <button type="submit" className="text-xs font-medium text-gray-500 hover:underline">
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No campaigns yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
