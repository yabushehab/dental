/**
 * Normalize Meta webhook payloads (WhatsApp Cloud API, Instagram Messaging,
 * Facebook Messenger) into a flat list of events the worker can process.
 * Pure functions — no I/O.
 */

export type Platform = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";

export type InboundMessageEvent = {
  kind: "message";
  platform: Platform;
  /** phone-number-id (WA) / IG business id / page id — matches Channel.externalId */
  channelExternalId: string;
  senderId: string;
  senderName?: string;
  messageId: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "OTHER";
  text?: string;
  /** quick-reply button payload (e.g. "CONFIRM") */
  buttonPayload?: string;
  timestamp: Date;
};

export type StatusEvent = {
  kind: "status";
  platform: Platform;
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  failReason?: string;
};

export type MetaEvent = InboundMessageEvent | StatusEvent;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const WA_TYPE_MAP: Record<string, InboundMessageEvent["type"]> = {
  text: "TEXT",
  image: "IMAGE",
  audio: "AUDIO",
  video: "VIDEO",
  document: "DOCUMENT",
};

function parseWhatsApp(payload: Any): MetaEvent[] {
  const events: MetaEvent[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change?.value;
      if (!value) continue;
      const channelExternalId = String(value.metadata?.phone_number_id ?? "");
      const names = new Map<string, string>(
        (value.contacts ?? []).map((c: Any) => [String(c.wa_id), String(c.profile?.name ?? "")]),
      );
      for (const msg of value.messages ?? []) {
        const type = WA_TYPE_MAP[msg.type as string] ?? "OTHER";
        let text: string | undefined;
        let buttonPayload: string | undefined;
        if (msg.type === "text") text = msg.text?.body;
        if (msg.type === "button") {
          text = msg.button?.text;
          buttonPayload = msg.button?.payload;
        }
        if (msg.type === "interactive") {
          const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
          text = reply?.title;
          buttonPayload = reply?.id;
        }
        events.push({
          kind: "message",
          platform: "WHATSAPP",
          channelExternalId,
          senderId: String(msg.from),
          senderName: names.get(String(msg.from)) || undefined,
          messageId: String(msg.id),
          type: msg.type === "button" || msg.type === "interactive" ? "TEXT" : type,
          text,
          buttonPayload,
          timestamp: new Date(Number(msg.timestamp) * 1000),
        });
      }
      for (const st of value.statuses ?? []) {
        const status = String(st.status ?? "").toUpperCase();
        if (["SENT", "DELIVERED", "READ", "FAILED"].includes(status)) {
          events.push({
            kind: "status",
            platform: "WHATSAPP",
            messageId: String(st.id),
            status: status as StatusEvent["status"],
            failReason: st.errors?.[0]?.title,
          });
        }
      }
    }
  }
  return events;
}

/** Instagram + Messenger share the entry[].messaging[] shape. */
function parseMessaging(payload: Any, platform: Platform): MetaEvent[] {
  const events: MetaEvent[] = [];
  for (const entry of payload.entry ?? []) {
    const channelExternalId = String(entry.id ?? "");
    for (const m of entry.messaging ?? []) {
      if (m.message && !m.message.is_echo) {
        const att = m.message.attachments?.[0]?.type as string | undefined;
        const type: InboundMessageEvent["type"] = m.message.text
          ? "TEXT"
          : att === "image"
            ? "IMAGE"
            : att === "audio"
              ? "AUDIO"
              : att === "video"
                ? "VIDEO"
                : att === "file"
                  ? "DOCUMENT"
                  : "OTHER";
        events.push({
          kind: "message",
          platform,
          channelExternalId,
          senderId: String(m.sender?.id),
          messageId: String(m.message.mid),
          type,
          text: m.message.text,
          buttonPayload: m.message.quick_reply?.payload,
          timestamp: new Date(Number(m.timestamp)),
        });
      }
    }
  }
  return events;
}

export function parseMetaWebhook(payload: Any): MetaEvent[] {
  switch (payload?.object) {
    case "whatsapp_business_account":
      return parseWhatsApp(payload);
    case "instagram":
      return parseMessaging(payload, "INSTAGRAM");
    case "page":
      return parseMessaging(payload, "FACEBOOK");
    default:
      return [];
  }
}
