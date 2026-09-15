# Roadmap

Each phase ships something a clinic can actually use. Phases 1–4 are the v1
"complete software"; 5+ are the SaaS growth track.

## Phase 0 — Foundation (week 1–2)
- Turborepo scaffold: `apps/web`, `apps/worker`, `packages/db`, `packages/shared`
- Prisma schema for tenancy core (Organization, Clinic, User, Membership) + RLS policies
- Auth (sign-up → create organization → onboarding wizard), RBAC middleware
- CI (lint, typecheck, test, migration check), seed script, dev docker-compose (Postgres + Redis + MinIO)

## Phase 1 — Patients & Scheduling (week 3–5)
- Patient CRUD, file numbers, medical history questionnaire with alert banners
- Document upload (S3 presigned), consent forms
- Calendar: day/week views by provider and by chair, drag-to-reschedule
- Appointment statuses + front-desk flow (check-in → in chair → completed)
- Provider schedules, working hours, appointment types
- **Milestone: a clinic can run its front desk on the system**

## Phase 2 — Clinical (week 6–8)
- Interactive FDI tooth chart (SVG, adult + deciduous, surface-level selection)
- Findings & completed work entry → chart history timeline
- Procedure code catalog with Bahrain-ready pricing/VAT defaults
- Treatment plans with phases, pricing, patient acceptance
- SOAP clinical notes with signing + amendments; prescriptions (PDF)
- **Milestone: dentists chart and document entirely in-system**

## Phase 3 — Billing (week 9–10)
- Invoices from completed treatment plan items, VAT handling (zero-rated vs 10%)
- Payments (cash/card/Benefit/transfer), receipts, patient statements & credit
- Insurance companies, policies, manual claim tracking, insurance-vs-patient split
- Daily reconciliation report + revenue reports
- **Milestone: the clinic bills and collects in-system**

## Phase 4 — CRM Inbox & Reminders (week 11–14)
- Meta app setup, Embedded Signup + FB Login for Business connection flows
- Webhook pipeline + worker, unified inbox (assign, labels, resolve, realtime)
- Contact↔Patient linking; patient context sidebar in inbox (next appt, balance)
- WhatsApp template management; automated appointment reminders with confirm buttons
- Campaigns to patient segments (recall lists, dormant patients)
- **Milestone: all patient communication lives in one inbox**

## Phase 5 — SaaS Hardening
- Subscription plans + billing (Stripe or regional gateway), usage limits
- Org onboarding polish, in-app help, data import (CSV from legacy systems)
- Audit log UI, PDPL data-export & erasure workflows
- Backups/DR runbook, monitoring & alerting

## Phase 6 — Later
- Patient portal / online booking
- Perio charting, orthodontic modules, lab case tracking
- Arabic UI + RTL
- SMS/email channels, TikTok
- Insurer e-claim integrations (per-insurer, Bahrain first)
- Analytics dashboards (production per provider, chair utilization)
