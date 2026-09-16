import Link from "next/link";
import { formatMoney, formatTime12h } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { orgCurrency } from "@/lib/currency";
import { withinReplyWindow } from "@/lib/channel-send";
import {
  setConversationStatusAction,
  toggleAssignAction,
  unlinkContactAction,
} from "@/lib/actions/inbox";
import { Composer } from "./composer";
import { LinkPatientForm } from "./link-patient-form";

const PLATFORM_ICONS: Record<string, string> = {
  WHATSAPP: "🟢",
  INSTAGRAM: "🟣",
  FACEBOOK: "🔵",
};
const STATUS_FILTERS = ["OPEN", "PENDING", "RESOLVED", "ALL"] as const;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; status?: string }>;
}) {
  const { db, organization, user } = await requireOrgContext();
  const sp = await searchParams;
  const currency = orgCurrency(organization);
  const tz = organization.timezone;

  const statusFilter = STATUS_FILTERS.includes((sp.status ?? "OPEN") as never)
    ? (sp.status ?? "OPEN")
    : "OPEN";

  const conversations = await db.conversation.findMany({
    where: statusFilter === "ALL" ? {} : { status: statusFilter as never },
    include: {
      contact: { include: { patient: true } },
      channel: true,
      messages: { orderBy: { at: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const selectedId = sp.c ?? conversations[0]?.id;
  const selected = selectedId
    ? await db.conversation.findUnique({
        where: { id: selectedId },
        include: {
          contact: { include: { patient: true } },
          channel: true,
          messages: { orderBy: { at: "asc" }, take: 100 },
        },
      })
    : null;

  // opening a thread clears its unread badge
  if (selected && selected.unreadCount > 0) {
    await db.conversation.update({ where: { id: selected.id }, data: { unreadCount: 0 } });
  }

  const templates = await db.messageTemplate.findMany({
    where: { approvalStatus: "APPROVED" },
    orderBy: { name: "asc" },
  });

  // patient context for the sidebar
  const patient = selected?.contact.patient ?? null;
  const [nextAppointment, outstanding] = patient
    ? await Promise.all([
        db.appointment.findFirst({
          where: {
            patientId: patient.id,
            startsAt: { gte: new Date() },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
          orderBy: { startsAt: "asc" },
          include: { type: true },
        }),
        db.invoice
          .findMany({ where: { patientId: patient.id, status: { in: ["ISSUED", "PARTIALLY_PAID"] } } })
          .then((list) => list.reduce((s, i) => s + (i.totalFils - i.paidFils), 0)),
      ])
    : [null, 0];

  const canFreeText = selected
    ? selected.channel.platform !== "WHATSAPP" || withinReplyWindow(selected.lastInboundAt)
    : false;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 overflow-hidden">
      {/* conversation list */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-3">
          <h1 className="text-base font-semibold">Inbox</h1>
          <div className="mt-2 flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f}
                href={`/inbox?status=${f}`}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  statusFilter === f ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>
        </div>
        <ul className="flex-1 divide-y divide-gray-50 overflow-y-auto">
          {conversations.map((c) => {
            const last = c.messages[0];
            const name = c.contact.patient
              ? `${c.contact.patient.firstName} ${c.contact.patient.lastName}`
              : c.contact.displayName ?? c.contact.externalUserId;
            return (
              <li key={c.id}>
                <Link
                  href={`/inbox?status=${statusFilter}&c=${c.id}`}
                  className={`block px-3 py-2.5 hover:bg-brand-50/60 ${c.id === selected?.id ? "bg-brand-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {PLATFORM_ICONS[c.channel.platform]} {name}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {last ? `${last.direction === "OUT" ? "You: " : ""}${last.body ?? `[${last.type.toLowerCase()}]`}` : "—"}
                  </div>
                </Link>
              </li>
            );
          })}
          {conversations.length === 0 && (
            <li className="p-6 text-center text-sm text-gray-400">No conversations</li>
          )}
        </ul>
      </div>

      {/* thread */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">
                  {PLATFORM_ICONS[selected.channel.platform]}{" "}
                  {selected.contact.patient
                    ? `${selected.contact.patient.firstName} ${selected.contact.patient.lastName}`
                    : selected.contact.displayName ?? selected.contact.externalUserId}
                </div>
                <div className="text-xs text-gray-500">{selected.channel.displayName}</div>
              </div>
              <div className="flex gap-2">
                <form action={toggleAssignAction.bind(null, selected.id)}>
                  <button type="submit" className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    {selected.assignedToUserId === user.id ? "Unassign me" : "Assign to me"}
                  </button>
                </form>
                {selected.status !== "RESOLVED" ? (
                  <form action={setConversationStatusAction.bind(null, selected.id, "RESOLVED")}>
                    <button type="submit" className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700">
                      Resolve
                    </button>
                  </form>
                ) : (
                  <form action={setConversationStatusAction.bind(null, selected.id, "OPEN")}>
                    <button type="submit" className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Reopen
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/60 p-4">
              {selected.messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "OUT" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      m.direction === "OUT"
                        ? "rounded-br-sm bg-brand-600 text-white"
                        : "rounded-bl-sm border border-gray-200 bg-white text-gray-900"
                    }`}
                  >
                    {m.templateName && (
                      <div className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.direction === "OUT" ? "text-brand-200" : "text-gray-400"}`}>
                        template · {m.templateName}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.body ?? `[${m.type.toLowerCase()}]`}</div>
                    <div className={`mt-0.5 text-right text-[10px] ${m.direction === "OUT" ? "text-brand-200" : "text-gray-400"}`}>
                      {formatTime12h(m.at, tz)}
                      {m.direction === "OUT" && ` · ${m.status.toLowerCase()}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Composer
              conversationId={selected.id}
              canFreeText={canFreeText}
              templates={templates.map((t) => ({ id: t.id, name: t.name, body: t.body }))}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            Select a conversation
          </div>
        )}
      </div>

      {/* patient sidebar */}
      {selected && (
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Patient</div>
            {patient ? (
              <div className="mt-2 text-sm">
                <Link href={`/patients/${patient.id}`} className="font-semibold text-brand-700 hover:underline">
                  {patient.firstName} {patient.lastName}
                </Link>
                <div className="text-xs text-gray-500">#{patient.fileNumber} · {patient.phone ?? "no phone"}</div>
                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="text-xs text-gray-400">Next appointment</dt>
                    <dd className="text-sm">
                      {nextAppointment
                        ? `${nextAppointment.startsAt.toISOString().slice(0, 10)} · ${formatTime12h(nextAppointment.startsAt, tz)}${nextAppointment.type ? ` · ${nextAppointment.type.name}` : ""} (${nextAppointment.status.toLowerCase()})`
                        : "None booked"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Outstanding balance</dt>
                    <dd className={`text-sm font-medium ${outstanding > 0 ? "text-red-600" : "text-green-700"}`}>
                      {formatMoney(outstanding, currency)}
                    </dd>
                  </div>
                </dl>
                <form action={unlinkContactAction.bind(null, selected.contact.id)} className="mt-3">
                  <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                    Unlink patient
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  Not linked to a patient record yet.
                </p>
                <div className="mt-2">
                  <LinkPatientForm contactId={selected.contact.id} />
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-500">
            <div className="font-semibold uppercase tracking-wide text-gray-400">Reply window</div>
            <p className="mt-1">
              {canFreeText
                ? "Open — free-form replies allowed."
                : "Closed (24h since last patient message) — only approved templates can be sent on WhatsApp."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
