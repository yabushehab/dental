# Architecture

## 1. Goals & Constraints

- **Multi-tenant SaaS**: many independent dental centers ("organizations"),
  each possibly with multiple branches. Strict data isolation between tenants.
- **Bahrain-first**: BHD currency (3 decimal places — stored as integer
  *fils*, 1 BHD = 1000 fils), 10% VAT with per-item rates (basic healthcare is
  zero-rated), +973 phone defaults, Asia/Bahrain timezone default. All of these
  are per-clinic settings so other markets work without code changes.
- **Compliance posture**: NHRA record-keeping expectations and Bahrain PDPL —
  audit trail on clinical/financial records, soft-delete only for clinical
  data, role-based access, encrypted at rest and in transit.
- **English UI** for v1. Copy lives in a message catalog from day one so
  additional languages can be added later without a rewrite (RTL is explicitly
  out of scope for v1).

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Web app | Next.js (App Router), TypeScript | One codebase for UI + API routes, server components for fast dashboards |
| Styling | Tailwind CSS + shadcn/ui | Fast to build a consistent clinical UI |
| API layer | Next.js route handlers + server actions; tRPC-style typed contracts via shared Zod schemas | End-to-end type safety without a second service |
| Database | PostgreSQL 16 | Relational integrity for clinical/financial data; JSONB where flexibility is needed (chart annotations, message payloads) |
| ORM | Prisma | Schema-as-code, migrations, works across web + worker |
| Background jobs | Node worker app using BullMQ + Redis | Webhook ingestion, reminder scheduling, campaign sends, retries with backoff |
| Auth | Auth.js (email/password + optional Google), session cookies | Simple, self-hosted, no vendor lock-in |
| File storage | S3-compatible object storage (X-rays, documents, message media) | Presigned URLs; never store PHI files on app servers |
| Realtime | Pusher-compatible websockets (or Soketi self-hosted) | Live inbox updates + calendar changes |
| Hosting (initial) | Vercel (web) + small VM/container host (worker + Redis) + managed Postgres | Cheap to start, standard to migrate |

## 3. System Diagram

```
                        ┌────────────────────────────┐
  Meta Webhooks ───────►│  apps/web (Next.js)        │
  (WhatsApp/IG/FB)      │  - UI (dashboard, inbox)   │
                        │  - API routes / actions    │──── Postgres (Prisma)
  Browser ─────────────►│  - webhook receivers*      │──── S3 (files/media)
                        └────────────┬───────────────┘
                                     │ enqueue (Redis/BullMQ)
                        ┌────────────▼───────────────┐
                        │  apps/worker               │
                        │  - process inbound msgs    │──── Meta Graph API
                        │  - appointment reminders   │──── WhatsApp Cloud API
                        │  - campaign sends          │
                        │  - claim/status jobs       │
                        └────────────────────────────┘

  * webhook receivers only verify signature + enqueue; all processing is in
    the worker so Meta's 20s timeout is never at risk.
```

## 4. Multi-Tenancy Model

- **Single database, shared schema.** Every tenant-owned table carries
  `organizationId`; branch-scoped tables also carry `clinicId`.
- **Enforcement in two layers:**
  1. A Prisma client extension automatically injects `organizationId` filters
     from the request context — application code cannot forget the filter.
  2. Postgres **Row-Level Security** as a backstop: the app connects with a
     role whose policies check `current_setting('app.org_id')`, set per
     request/job. A bug in layer 1 still cannot leak cross-tenant data.
- **Hierarchy:** `Organization` (the paying customer) → `Clinic` (branch) →
  everything else. Patients belong to the organization (shared across
  branches); appointments, chairs, and invoices belong to a clinic.
- **Subscription/billing of tenants** (our revenue): `Organization` holds
  plan, status, and limits. v1 can be manual invoicing; Stripe or a regional
  gateway slots in behind the same fields later.

## 5. Roles & Permissions

Role-based access control, per organization membership:

| Role | Typical user | Highlights |
|---|---|---|
| `OWNER` | Practice owner | Everything incl. subscription & staff management |
| `ADMIN` | Practice manager | Settings, staff, reports; no subscription changes |
| `DENTIST` | Treating clinician | Full clinical write on own patients, read others; sign notes |
| `HYGIENIST` / `ASSISTANT` | Clinical support | Charting/notes drafts, no signing, no financials |
| `RECEPTIONIST` | Front desk | Scheduling, patient demographics, CRM inbox, take payments |
| `ACCOUNTANT` | Finance | Invoices, payments, claims, reports; no clinical access |

Clinical notes are **immutable once signed** (append amendments instead) —
this is the standard medico-legal expectation and what NHRA auditors look for.

## 6. Repository Layout (Turborepo)

```
dental/
├── apps/
│   ├── web/                     # Next.js app
│   │   ├── app/
│   │   │   ├── (auth)/          # sign-in, sign-up, org onboarding
│   │   │   ├── (dashboard)/
│   │   │   │   ├── patients/    # list, profile, history, documents
│   │   │   │   ├── schedule/    # calendar, appointment CRUD
│   │   │   │   ├── clinical/    # charting, tx plans, notes, rx
│   │   │   │   ├── billing/     # invoices, payments, insurance, claims
│   │   │   │   ├── inbox/       # omnichannel CRM inbox
│   │   │   │   ├── campaigns/   # broadcasts, templates
│   │   │   │   ├── reports/
│   │   │   │   └── settings/    # clinic, staff, channels, tax, templates
│   │   │   └── api/
│   │   │       └── webhooks/meta/   # verify + enqueue only
│   │   └── ...
│   └── worker/                  # BullMQ processors
│       └── src/jobs/            # inbound-message, reminders, campaigns, media-sync
├── packages/
│   ├── db/                      # Prisma schema, migrations, seed, RLS policies
│   ├── shared/                  # Zod schemas, money (fils) utils, FDI tooth utils, permissions
│   └── config/                  # eslint/tsconfig presets
├── docs/
└── turbo.json
```

## 7. Cross-Cutting Decisions

- **Money**: integers only, minor units per currency (`amountFils` for BHD).
  Currency + minor-unit exponent stored on the organization. No floats, ever.
- **IDs**: `cuid2` strings (safe to expose in URLs), plus per-clinic
  human-readable sequences for invoices (`INV-2026-00042`) and patient file
  numbers, generated transactionally.
- **Audit log**: append-only `AuditEvent` table (who, what, before/after JSON,
  IP) written for clinical, financial, and settings mutations.
- **Soft delete** for patients and clinical records (`deletedAt`); hard delete
  only via PDPL data-erasure workflow executed by `OWNER`.
- **Time**: everything stored UTC; clinic timezone applied at the edge.
  Appointments store both UTC instant and clinic-local wall time to survive
  DST-free-but-policy-changes regions.
- **Files**: metadata row in Postgres (`Document`), bytes in S3 under
  `org/{orgId}/...` keys; presigned, short-lived URLs only.
