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
 * Send through the channel, or simulate when it has no token (demo mode /
 * not yet connected): the message is treated as sent so the whole pipeline
 * works without Meta credentials.
 */
export async function sendViaChannel(
  channel: Channel,
  recipientExternalId: string,
  content:
    | { kind: "text"; text: string }
    | { kind: "template"; name: string; language: string; params: string[] },
): Promise<SendResult & { simulated?: boolean }> {
  if (!channel.accessTokenEnc) {
    return { ok: true, externalMessageId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, simulated: true };
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
  // Instagram / Messenger: templates render to plain text
  const text =
    content.kind === "text"
      ? content.text
      : content.params.reduce((body, p, i) => body.replaceAll(`{{${i + 1}}}`, p), content.name);
  return sendMessagingText(token, channel.externalId, recipientExternalId, text);
}
