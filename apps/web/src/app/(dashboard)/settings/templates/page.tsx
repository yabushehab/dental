import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "@/lib/rbac";
import { createTemplateAction, markTemplateApprovedAction } from "@/lib/actions/crm-admin";

const APPROVAL_BADGES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function TemplatesSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);
  const templates = await db.messageTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-xl font-semibold">Message templates</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        WhatsApp requires pre-approved templates for business-initiated messages (reminders,
        campaigns, replies outside the 24-hour window). Placeholders: {"{{1}}"}, {"{{2}}"}…
      </p>

      <div className="mt-5 max-w-3xl rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {templates.map((t) => (
            <li key={t.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold">{t.name} · {t.language}</span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_BADGES[t.approvalStatus]}`}>
                    {t.approvalStatus.toLowerCase()}
                  </span>
                  {t.approvalStatus !== "APPROVED" && (
                    <form action={markTemplateApprovedAction.bind(null, t.id)}>
                      <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                        Mark approved
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <p className="mt-1 text-gray-600">{t.body}</p>
            </li>
          ))}
        </ul>
        <form action={createTemplateAction} className="space-y-2 border-t border-gray-100 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <input name="name" required placeholder="template_name (lowercase_underscores)" className="flex-1 rounded-md border border-gray-300 px-2 py-1.5" />
            <input name="language" defaultValue="en" className="w-16 rounded-md border border-gray-300 px-2 py-1.5" />
          </div>
          <div className="flex gap-2">
            <input name="body" required placeholder="Hello {{1}}, your appointment at {{2}}…" className="flex-1 rounded-md border border-gray-300 px-2 py-1.5" />
            <button type="submit" className="rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700">
              Add template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
