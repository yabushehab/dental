import { orgScoped, prisma } from "@dentalos/db";
import { requirePermission } from "@/lib/rbac";
import { createChannelAction, disconnectChannelAction } from "@/lib/actions/crm-admin";

export default async function ChannelsSettingsPage() {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);
  const channels = await db.channel.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="text-xl font-semibold">Messaging channels</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Connect your WhatsApp Business number, Instagram account, and Facebook page. A channel
        without an access token runs in <span className="font-medium">simulated mode</span> —
        messages appear in the inbox but are not delivered — so you can trial the workflow before
        connecting Meta.
      </p>

      <div className="mt-5 max-w-3xl rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {channels.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{c.displayName}</div>
                <div className="text-xs text-gray-500">
                  {c.platform} · id {c.externalId} ·{" "}
                  {c.accessTokenEnc ? "live (token stored encrypted)" : "simulated (no token)"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "CONNECTED"
                      ? "bg-green-100 text-green-700"
                      : c.status === "EXPIRED"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.status.toLowerCase()}
                </span>
                {c.status === "CONNECTED" && (
                  <form action={disconnectChannelAction.bind(null, c.id)}>
                    <button type="submit" className="text-xs font-medium text-gray-500 hover:underline">
                      Disconnect
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {channels.length === 0 && (
            <li className="px-4 py-4 text-sm text-gray-400">No channels yet</li>
          )}
        </ul>
        <form action={createChannelAction} className="grid grid-cols-2 gap-2 border-t border-gray-100 px-4 py-3 text-sm sm:grid-cols-4">
          <select name="platform" className="rounded-md border border-gray-300 px-2 py-1.5" defaultValue="WHATSAPP">
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
          </select>
          <input name="externalId" required placeholder="Phone-number-id / page id" className="rounded-md border border-gray-300 px-2 py-1.5" />
          <input name="displayName" required placeholder="Display name" className="rounded-md border border-gray-300 px-2 py-1.5" />
          <input name="accessToken" placeholder="Access token (optional)" className="rounded-md border border-gray-300 px-2 py-1.5" />
          <button type="submit" className="col-span-2 rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700 sm:col-span-1">
            Add channel
          </button>
        </form>
      </div>

      <div className="mt-5 max-w-3xl rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
        <div className="font-semibold text-gray-800">Webhook configuration (Meta app dashboard)</div>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Callback URL: <code className="rounded bg-gray-100 px-1">https://your-domain/api/webhooks/meta</code></li>
          <li>Verify token: the value of <code className="rounded bg-gray-100 px-1">META_WEBHOOK_VERIFY_TOKEN</code></li>
          <li>Signature checks use <code className="rounded bg-gray-100 px-1">META_APP_SECRET</code></li>
          <li>Subscribe to: <code className="rounded bg-gray-100 px-1">messages</code> (WhatsApp), <code className="rounded bg-gray-100 px-1">messages</code> (Instagram), <code className="rounded bg-gray-100 px-1">messages</code> (Page)</li>
        </ul>
      </div>
    </div>
  );
}
