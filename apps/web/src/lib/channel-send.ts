import type { Channel } from "@dentalos/db";
import {
  decryptToken,
  sendMessagingText,
  sendWhatsAppTemplate,
  sendWhatsAppText,
  type SendResult,
} from "@dentalos/meta";

function tokenSecret(): string {
  return process.env.META_TOKEN_KEY ?? process.env.AUTH_SECRET ?? "dev-only-secret-change-me";
}

/**
 * Send through a channel, or simulate when it has no stored token —
 * same contract as the worker's sender.
 */
export async function sendViaChannel(
  channel: Channel,
  recipientExternalId: string,
  content:
    | { kind: "text"; text: string }
    | { kind: "template"; name: string; language: string; params: string[] },
): Promise<SendResult & { simulated?: boolean }> {
  if (!channel.accessTokenEnc) {
    return {
      ok: true,
      externalMessageId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      simulated: true,
    };
  }
  const token = decryptToken(channel.accessTokenEnc, tokenSecret());
  if (channel.platform === "WHATSAPP") {
    return content.kind === "text"
      ? sendWhatsAppText(token, channel.externalId, recipientExternalId, content.text)
      : sendWhatsAppTemplate(
          token,
          channel.externalId,
          recipientExternalId,
          content.name,
          content.language,
          content.params,
        );
  }
  const text =
    content.kind === "text"
      ? content.text
      : content.params.reduce((body, p, i) => body.replaceAll(`{{${i + 1}}}`, p), content.name);
  return sendMessagingText(token, channel.externalId, recipientExternalId, text);
}

/** Free-form replies are allowed only within 24h of the last inbound message. */
export function withinReplyWindow(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - lastInboundAt.getTime() < 24 * 60 * 60 * 1000;
}
