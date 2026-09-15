# DentalOS — Dental Center Management Platform

Multi-tenant SaaS for dental centers: patient management, clinical charting,
scheduling, billing, and an omnichannel CRM inbox (WhatsApp, Instagram,
Facebook Messenger).

**Primary market:** Bahrain (BHD, 10% VAT, NHRA/PDPL compliance), designed to
expand regionally.

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, tech stack, multi-tenancy, repo layout |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Database schema — every entity and relationship |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | WhatsApp Cloud API, Meta Graph API (Instagram/Facebook) design |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Build phases and milestones |

## Product Modules

1. **Patients** — demographics, medical history, documents, consent
2. **Scheduling** — calendar by provider/chair, statuses, automated reminders
3. **Clinical** — FDI tooth charting, treatment plans, clinical notes (SOAP), prescriptions
4. **Billing** — invoices, payments, insurance policies & claim tracking (BHD-native, integer fils)
5. **CRM Inbox** — unified conversations across WhatsApp / Instagram / Messenger, templates, campaigns
6. **Admin** — clinic settings, staff & roles, audit log, subscription management

## Tech Stack (summary)

- **Web app:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Background jobs:** dedicated worker (reminders, webhook processing, campaigns)
- **Monorepo:** Turborepo — `apps/web`, `apps/worker`, `packages/db`, `packages/shared`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.
