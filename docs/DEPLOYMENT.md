# Deployment

DentalOS runs as two services against one PostgreSQL database:

| Service | What it does | Needs a public URL? |
|---|---|---|
| `dentalos-web` | The application clinics use, plus the Meta webhook endpoint | Yes |
| `dentalos-worker` | Processes inbound messages, sends reminders, runs campaigns, applies migrations | No |

Both are containerised (`Dockerfile.web`, `Dockerfile.worker`) so they run
on any host that takes a Docker image.

---

## Recommended path — Render Blueprint

Render provisions all three pieces from `render.yaml` in one step, and the
Frankfurt region is the closest to Bahrain. Budget roughly **US$20/month**
for the starter tiers (verify current pricing — the free Postgres tier
expires after 30 days and is unsuitable for patient records).

### 1. Deploy

1. Push this repository to GitHub (already done if you are reading this in
   the repo).
2. In Render: **New → Blueprint**, select the repository, confirm.
   Render reads `render.yaml` and creates the database, web service, and
   worker. `AUTH_SECRET` and `META_TOKEN_KEY` are generated automatically
   and shared between both services.
3. Wait for the first build (5–10 minutes). The worker applies all database
   migrations as it starts.
4. Open `https://<your-service>.onrender.com/api/health` — it must return
   `{"status":"ok","database":"up"}`.

### 2. Create your clinic

Visit the URL, choose **Create an account**, and complete the onboarding
form. The first account becomes the `OWNER` of a new organization. Do **not**
run the demo seed against production — it creates accounts with a published
password.

### 3. Add a custom domain (optional)

Render → your web service → **Settings → Custom Domain**, then add the CNAME
record it shows at your DNS provider. TLS is issued automatically. Use the
custom domain for the Meta webhook URL so it survives service renames.

---

## Environment variables

Set on **both** services unless noted. The blueprint wires the first three
automatically.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Signs session cookies. Minimum 32 characters — the app refuses to start otherwise. Generate with `openssl rand -base64 32` |
| `META_TOKEN_KEY` | Recommended | Encrypts stored channel access tokens. Falls back to `AUTH_SECRET` if unset. **Must be identical on web and worker**, or the worker cannot decrypt what the web app stored |
| `META_APP_ID` | For live messaging | From your Meta app |
| `META_APP_SECRET` | For live messaging | Verifies webhook signatures. Until set, webhook signature checking is skipped — set it before going live |
| `META_WEBHOOK_VERIFY_TOKEN` | For live messaging | Any random string; must match what you type into the Meta dashboard |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | For file uploads | X-ray and document storage. Without them, uploads are disabled with an in-app notice; everything else works |

Changing a secret invalidates existing sessions (`AUTH_SECRET`) or stored
channel tokens (`META_TOKEN_KEY`), so set them once at launch.

---

## Connecting WhatsApp, Instagram and Facebook

Channels work in **simulated mode** until you connect Meta: messages appear
in the inbox and campaigns record their results, but nothing is delivered.
That is deliberate — you can train staff on the real workflow while Meta
review is pending.

To go live:

1. Create a Meta app at `developers.facebook.com` (type: Business) and add
   the **WhatsApp** and **Messenger** products.
2. Complete Business Verification for your dental centre. This is the
   slowest step — start it early.
3. Set `META_APP_ID`, `META_APP_SECRET` and `META_WEBHOOK_VERIFY_TOKEN` on
   both services and redeploy.
4. In the Meta app dashboard, configure the webhook:
   - Callback URL: `https://<your-domain>/api/webhooks/meta`
   - Verify token: your `META_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the `messages` field for each product you use.
5. In DentalOS: **Settings → Messaging channels**, add a channel with the
   WhatsApp phone-number-id (or Instagram/Page id) and paste the long-lived
   access token. It is encrypted before storage.
6. Submit your message templates for approval in the Meta dashboard, then
   mark them approved under **Settings → Message templates**.

Reminders and campaigns only use approved templates, which is what Meta
requires for business-initiated messages.

---

## Operating it

**Migrations.** The worker applies pending migrations on every deploy. For a
zero-downtime release, apply them first from your machine:

```bash
DATABASE_URL="<production url>" ./scripts/release.sh
```

**Backups.** Patient records are medical and financial records. Render's paid
Postgres plans include daily backups with point-in-time recovery — confirm it
is enabled, and periodically test a restore. This is a legal obligation, not
a nicety.

**Monitoring.** Point an uptime monitor at `/api/health`; it returns 503 when
the database is unreachable, so it catches real outages rather than just
"the process is alive".

**Logs.** The worker logs each job failure with its cause. Webhook
deliveries that fail processing are kept in the `webhook_events` table with
the error, so nothing is lost and they can be replayed.

---

## Security hardening before real patient data

1. **Set `META_APP_SECRET`** so webhook signatures are verified. Without it
   anyone who learns your webhook URL can post fabricated messages.
2. **Restrict database access** to your services only (the blueprint sets an
   empty `ipAllowList`, which does this).
3. **Row-Level Security** (`packages/db/sql/rls.sql`) is written but *not
   enabled by default*: it requires the app to connect as a restricted role
   and set `app.org_id` on every transaction, which is a code change not yet
   made. Tenant isolation is currently enforced by the `orgScoped` Prisma
   extension, which every query goes through. Enabling RLS without the
   connection work would break the app — treat it as planned hardening, not
   a switch to flip.
4. **Review staff roles** — `OWNER` and `ADMIN` can see everything;
   receptionists cannot open clinical notes.

---

## Alternative hosts

**Vercel (web) + managed Postgres + a worker host.** Vercel is a natural fit
for Next.js and ignores `output: "standalone"`. It cannot run the worker
(long-running process), so reminders, campaigns and inbound message
processing need a second host such as Render, Railway or Fly. Use
[Neon](https://neon.tech) or similar for Postgres.

**Your own VPS.** Build and run both images directly:

```bash
docker build -f Dockerfile.web -t dentalos-web .
docker build -f Dockerfile.worker -t dentalos-worker .
docker run -d --env-file .env.production -p 3000:3000 dentalos-web
docker run -d --env-file .env.production dentalos-worker
```

Put a TLS-terminating reverse proxy (Caddy or nginx) in front of the web
container. You are then responsible for backups and updates.

---

## Post-deploy checklist

- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] You can create an account and complete clinic onboarding
- [ ] Currency shows BHD and times are in Asia/Bahrain
- [ ] A test patient, appointment and invoice can be created
- [ ] Database backups are enabled and a restore has been tested
- [ ] `META_APP_SECRET` is set before any real patient messaging
- [ ] Uptime monitor is watching `/api/health`

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Service exits with "Configuration error — refusing to start" | `AUTH_SECRET` missing or shorter than 32 characters. The message names the variable |
| `/api/health` returns 503 | `DATABASE_URL` wrong, or the database is unreachable from the service |
| Webhook returns 401 | Signature mismatch — `META_APP_SECRET` differs from the Meta app's secret |
| Webhook verification fails in the Meta dashboard | `META_WEBHOOK_VERIFY_TOKEN` differs from what you typed into Meta |
| Messages send but never arrive | The channel has no access token, so it is in simulated mode |
| Worker sends nothing | Check its logs for migration failures; confirm it shares `DATABASE_URL` and `META_TOKEN_KEY` with the web service |
