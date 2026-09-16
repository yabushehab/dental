import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./crypto";
import { parseMetaWebhook } from "./parse";
import { renderTemplateBody } from "./send";
import { signMetaPayload, verifyMetaSignature } from "./signature";

describe("verifyMetaSignature", () => {
  const secret = "app-secret";
  const body = JSON.stringify({ object: "whatsapp_business_account" });

  it("accepts a correctly signed body", () => {
    expect(verifyMetaSignature(secret, body, signMetaPayload(secret, body))).toBe(true);
  });

  it("rejects wrong secret, tampered body, and malformed headers", () => {
    expect(verifyMetaSignature("other", body, signMetaPayload(secret, body))).toBe(false);
    expect(verifyMetaSignature(secret, body + " ", signMetaPayload(secret, body))).toBe(false);
    expect(verifyMetaSignature(secret, body, null)).toBe(false);
    expect(verifyMetaSignature(secret, body, "sha1=abc")).toBe(false);
    expect(verifyMetaSignature(secret, body, "sha256=zz")).toBe(false);
  });
});

describe("parseMetaWebhook — WhatsApp", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "97317000000", phone_number_id: "demo-wa-100001" },
              contacts: [{ profile: { name: "Zainab Ashoor" }, wa_id: "97336000008" }],
              messages: [
                {
                  from: "97336000008",
                  id: "wamid.TEST123",
                  timestamp: "1789600000",
                  type: "text",
                  text: { body: "CONFIRM" },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  it("extracts an inbound text message", () => {
    const events = parseMetaWebhook(payload);
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.kind).toBe("message");
    if (e.kind === "message") {
      expect(e.platform).toBe("WHATSAPP");
      expect(e.channelExternalId).toBe("demo-wa-100001");
      expect(e.senderId).toBe("97336000008");
      expect(e.senderName).toBe("Zainab Ashoor");
      expect(e.text).toBe("CONFIRM");
      expect(e.messageId).toBe("wamid.TEST123");
    }
  });

  it("extracts delivery statuses", () => {
    const events = parseMetaWebhook({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "demo-wa-100001" },
                statuses: [{ id: "wamid.OUT1", status: "read", timestamp: "1789600001" }],
              },
            },
          ],
        },
      ],
    });
    expect(events).toEqual([
      { kind: "status", platform: "WHATSAPP", messageId: "wamid.OUT1", status: "READ", failReason: undefined },
    ]);
  });

  it("extracts quick-reply button payloads", () => {
    const events = parseMetaWebhook({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "demo-wa-100001" },
                messages: [
                  {
                    from: "97336000008",
                    id: "wamid.BTN1",
                    timestamp: "1789600002",
                    type: "button",
                    button: { text: "Confirm", payload: "CONFIRM" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const e = events[0]!;
    expect(e.kind === "message" && e.buttonPayload).toBe("CONFIRM");
  });
});

describe("parseMetaWebhook — Instagram/Messenger", () => {
  it("extracts IG direct messages and ignores echoes", () => {
    const events = parseMetaWebhook({
      object: "instagram",
      entry: [
        {
          id: "demo-ig-200001",
          time: 1789600000000,
          messaging: [
            {
              sender: { id: "ig-90001" },
              recipient: { id: "demo-ig-200001" },
              timestamp: 1789600000000,
              message: { mid: "mid.IG1", text: "Do you do veneers?" },
            },
            {
              sender: { id: "demo-ig-200001" },
              recipient: { id: "ig-90001" },
              timestamp: 1789600001000,
              message: { mid: "mid.IG2", text: "Yes!", is_echo: true },
            },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.kind === "message" && e.platform).toBe("INSTAGRAM");
    expect(e.kind === "message" && e.text).toBe("Do you do veneers?");
  });

  it("returns nothing for unknown objects", () => {
    expect(parseMetaWebhook({ object: "something_else" })).toEqual([]);
    expect(parseMetaWebhook(null)).toEqual([]);
  });
});

describe("token crypto", () => {
  it("round-trips and fails on wrong secret", () => {
    const enc = encryptToken("EAAG-long-lived-token", "secret-1");
    expect(decryptToken(enc, "secret-1")).toBe("EAAG-long-lived-token");
    expect(() => decryptToken(enc, "secret-2")).toThrow();
  });
});

describe("renderTemplateBody", () => {
  it("fills numbered placeholders", () => {
    expect(renderTemplateBody("Hello {{1}}, see you {{2}}.", ["Fatima", "tomorrow"])).toBe(
      "Hello Fatima, see you tomorrow.",
    );
    expect(renderTemplateBody("Missing {{3}}", ["a"])).toBe("Missing {{3}}");
  });
});
