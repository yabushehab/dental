# Messaging Integrations (WhatsApp / Instagram / Facebook)

All three launch channels run on Meta's platform, which simplifies things:
one Meta App, one webhook endpoint, one review process.

## 1. Prerequisites (per tenant clinic)

| Channel | What the clinic needs |
|---|---|
| WhatsApp | Meta Business Portfolio + WhatsApp Business Account (WABA) + a phone number not registered on the consumer app |
| Instagram | Instagram Professional account linked to a Facebook Page |
| Facebook | Facebook Page with Messenger enabled |

**Our side (one-time):** a Meta App with `whatsapp_business_messaging`,
`instagram_manage_messages`, `pages_messaging` permissions, passed through
App Review + Business Verification. Tenants connect via **Embedded Signup**
(WhatsApp) and **Facebook Login for Business** (IG/FB) — OAuth flows in our
settings UI, no manual token pasting.

## 2. Webhook Pipeline

```
Meta POST /api/webhooks/meta
  1. Verify X-Hub-Signature-256 (app secret)          [reject on mismatch]
  2. Upsert WebhookEvent by externalEventId           [idempotency]
  3. Enqueue job, return 200 immediately              [< 1s, Meta requires fast ack]

worker: inbound-message job
  4. Resolve Channel by phone-number-id / page id / IG id
  5. Upsert Contact (wa_id / PSID / IGSID)
  6. Auto-link Contact→Patient by E.164 phone match (WhatsApp only)
  7. Upsert Conversation, set lastInboundAt (opens 24h window)
  8. Insert Message; download media via Graph API → S3 (Meta media URLs expire)
  9. Push realtime event to open inbox sessions
 10. Status webhooks (sent/delivered/read/failed) update Message.status
```

## 3. Messaging Rules We Must Encode

- **24-hour window** (all three platforms): free-form replies only within 24h
  of the patient's last inbound message. The composer checks
  `Conversation.lastInboundAt`:
  - inside window → free text allowed;
  - outside window → WhatsApp: template messages only (composer switches to a
    template picker); IG/FB: `HUMAN_AGENT` tag allows 7 days, otherwise blocked.
- **Templates** (WhatsApp): created in our UI → submitted via API → Meta
  approval status tracked on `MessageTemplate.approvalStatus`. Reminders and
  campaigns always use templates (they're business-initiated).
- **Opt-in/opt-out**: patients must consent to proactive WhatsApp messages
  (checkbox at registration, stored on Patient). "STOP" replies set an
  opt-out flag that campaigns and reminders respect.
- **Rate/quality**: WhatsApp number quality rating and messaging tier limits
  surfaced in channel settings; campaign sender throttles per tier.

## 4. Appointment Reminder Flow

```
worker cron (every 5 min)
 → find appointments whose (startsAt - rule.offset) window just passed
 → skip if opted out / already sent (ReminderLog)
 → send WhatsApp template e.g. appointment_reminder(name, date, time, clinic)
 → patient taps quick-reply button:
     "Confirm"    → Appointment.status = CONFIRMED
     "Reschedule" → Conversation opened + flagged to front desk
```

## 5. Failure & Token Hygiene

- Long-lived tokens stored encrypted; a daily job checks validity and expiry,
  flips `Channel.status = EXPIRED`, and notifies clinic admins in-app.
- Send failures: retry with exponential backoff (BullMQ), then mark
  `Message.status = FAILED` with `failReason` shown in the inbox.
- Every raw payload is kept in `WebhookEvent` so processing bugs can be
  replayed without data loss.

## 6. Out of Scope for v1 (explicitly)

- SMS/email channels (structure supports adding a `Channel.platform` later)
- Instagram comment / story-mention management (DMs only in v1)
- TikTok and other platforms
- Chatbot/AI auto-replies (inbox is human-operated in v1)
