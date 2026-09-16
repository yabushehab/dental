/**
 * Outbound Graph API calls. Every function takes the decrypted access token;
 * callers decide simulated vs. real mode (no token = simulate upstream).
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export type SendResult = { ok: true; externalMessageId: string } | { ok: false; error: string };

async function graphPost(path: string, token: string, body: unknown): Promise<SendResult> {
  try {
    const res = await fetch(`${GRAPH}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
      message_id?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, externalMessageId: data.messages?.[0]?.id ?? data.message_id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}

export function sendWhatsAppText(
  token: string,
  phoneNumberId: string,
  toWaId: string,
  text: string,
): Promise<SendResult> {
  return graphPost(`${phoneNumberId}/messages`, token, {
    messaging_product: "whatsapp",
    to: toWaId,
    type: "text",
    text: { body: text },
  });
}

export function sendWhatsAppTemplate(
  token: string,
  phoneNumberId: string,
  toWaId: string,
  templateName: string,
  language: string,
  bodyParams: string[],
): Promise<SendResult> {
  return graphPost(`${phoneNumberId}/messages`, token, {
    messaging_product: "whatsapp",
    to: toWaId,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: bodyParams.length
        ? [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ]
        : [],
    },
  });
}

/** Instagram & Messenger use the Send API on the page/IG account. */
export function sendMessagingText(
  token: string,
  channelExternalId: string,
  recipientId: string,
  text: string,
): Promise<SendResult> {
  return graphPost(`${channelExternalId}/messages`, token, {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: "RESPONSE",
  });
}

/** Fill {{1}}, {{2}}… placeholders locally (previews + simulated sends). */
export function renderTemplateBody(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? `{{${n}}}`);
}
