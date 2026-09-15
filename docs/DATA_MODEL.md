# Data Model

Entity-by-entity design for the Prisma/PostgreSQL schema. Every tenant-owned
table has `organizationId` (and `clinicId` where branch-scoped), `createdAt`,
`updatedAt`; clinical/financial tables add `deletedAt` (soft delete).

## 1. Tenancy & Staff

**Organization** — the paying tenant.
`name, slug, currency (BHD), currencyExponent (3), country (BH), timezone (Asia/Bahrain), defaultVatRate (10.00), plan, planStatus, trialEndsAt`

**Clinic** — a branch.
`organizationId, name, address, phone, email, workingHours (JSONB weekly template), isActive`

**User** — a person who can sign in (global identity).
`email, passwordHash, name, phone, avatarUrl`

**Membership** — links User↔Organization with a role.
`userId, organizationId, role (OWNER|ADMIN|DENTIST|HYGIENIST|ASSISTANT|RECEPTIONIST|ACCOUNTANT), clinicIds[] (branch restriction, empty = all), isActive`

**Provider** — clinical practitioner profile (a Membership with clinical role).
`membershipId, title, specialty, nhraLicenseNo, licenseExpiry, color (calendar), defaultAppointmentMins`

**AuditEvent** — append-only.
`organizationId, actorUserId, action, entityType, entityId, before (JSONB), after (JSONB), ip, at`

## 2. Patients

**Patient**
`organizationId, fileNumber (per-org sequence), firstName, lastName, dob, sex, cpr (Bahrain ID, optional, encrypted), phone (E.164, +973 default), email, address, emergencyContact (JSONB), referralSource, primaryClinicId, notes, tags[], balanceCacheFils`

**MedicalHistory** — versioned questionnaire per patient.
`patientId, answers (JSONB: conditions, medications, allergies, pregnancy, smoking...), alerts[] (surfaced as red banners: e.g. penicillin allergy, anticoagulants), completedByUserId, signedAt`

**Document**
`organizationId, patientId?, type (XRAY|PHOTO|LAB|CONSENT|INSURANCE_CARD|OTHER), s3Key, fileName, mimeType, sizeBytes, uploadedByUserId`

**ConsentForm**
`patientId, templateId, contentSnapshot, signatureS3Key, signedAt, witnessUserId`

## 3. Scheduling

**Chair** (operatory) — `clinicId, name, isActive`

**Appointment**
`clinicId, patientId, providerId, chairId?, startsAtUtc, endsAtUtc, localDate, status (SCHEDULED|CONFIRMED|CHECKED_IN|IN_CHAIR|COMPLETED|NO_SHOW|CANCELLED|RESCHEDULED), type (from per-clinic AppointmentType list), reason, cancellationReason?, createdVia (STAFF|PATIENT_REPLY|CAMPAIGN), colorOverride?`

**AppointmentType** — `clinicId, name, defaultMins, defaultProcedureCodes[], color`

**ProviderSchedule** — working template + exceptions.
`providerId, clinicId, weekday, startTime, endTime` plus **ScheduleException** (`date, isDayOff, altStart?, altEnd?`)

**ReminderRule** — per clinic.
`clinicId, offset (e.g. P1D, PT3H), channel (WHATSAPP|SMS|NONE), templateId, requiresConfirmation (bool → reply YES maps to CONFIRMED)`

**ReminderLog** — `appointmentId, ruleId, channel, sentAt, deliveryStatus, patientReply?`

## 4. Clinical

**ToothRecord** — current state of each tooth (FDI 11–48, plus 51–85 deciduous).
`patientId, toothFdi, status (PRESENT|MISSING|IMPLANT|EXTRACTED|UNERUPTED), notes`

**ChartEntry** — the historical chart: one row per finding/treatment on a tooth or surface.
`patientId, toothFdi?, surfaces[] (M|O|D|B|L|I subset), kind (FINDING|PLANNED|COMPLETED), code (ProcedureCode), description, providerId, appointmentId?, enteredAt, meta (JSONB: caries depth, mobility grade, etc.)`
> The graphical tooth chart is a projection of `ToothRecord` + latest `ChartEntry` per tooth/surface.

**ProcedureCode** — per-org catalog (seeded with a standard dental set; clinics edit prices).
`organizationId, code, name, category (DIAGNOSTIC|PREVENTIVE|RESTORATIVE|ENDO|PERIO|PROSTHO|ORTHO|SURGERY|IMPLANT|COSMETIC), defaultPriceFils, vatRate (0 for zero-rated healthcare, 10.00 for cosmetic), defaultMins, isPerTooth, isPerSurface`

**TreatmentPlan** — `patientId, providerId, title, status (DRAFT|PROPOSED|ACCEPTED|IN_PROGRESS|COMPLETED|CANCELLED), presentedAt, acceptedAt`

**TreatmentPlanItem**
`planId, procedureCodeId, toothFdi?, surfaces[], priority (phase number), priceFils, vatRate, insuranceEstimateFils?, status (PENDING|SCHEDULED|COMPLETED|CANCELLED), completedChartEntryId?`

**ClinicalNote** — SOAP-structured, immutable after signing.
`patientId, appointmentId?, providerId, subjective, objective, assessment, plan, signedAt?, signedByUserId?` + **NoteAmendment** (`noteId, text, byUserId, at`)

**Prescription**
`patientId, providerId, items (JSONB: drug, dose, frequency, duration), notes, issuedAt, pdfS3Key`

## 5. Billing (BHD — all amounts integer fils)

**Invoice**
`clinicId, patientId, number (INV-YYYY-NNNNN), status (DRAFT|ISSUED|PARTIALLY_PAID|PAID|VOID|WRITTEN_OFF), issuedAt, dueAt, subtotalFils, vatFils, totalFils, paidFils, insurancePortionFils, patientPortionFils, notes`

**InvoiceLine**
`invoiceId, procedureCodeId?, treatmentPlanItemId?, description, toothFdi?, qty, unitPriceFils, discountFils, vatRate, vatFils, totalFils`

**Payment**
`clinicId, patientId, invoiceId?, amountFils, method (CASH|CARD|BENEFIT|BANK_TRANSFER|INSURANCE), reference?, receivedByUserId, receivedAt, receiptNumber`
> BENEFIT = Bahrain's national debit network; unallocated payments (no invoice) sit as patient credit.

**InsuranceCompany** — per-org list. `name, phone, email, notes`

**InsurancePolicy**
`patientId, companyId, policyNumber, memberId, coveragePercent, annualLimitFils, usedFils, expiresAt, coverageNotes`

**InsuranceClaim** — manual tracking in v1 (no insurer API).
`invoiceId, policyId, claimedFils, status (PREPARING|SUBMITTED|APPROVED|PARTIALLY_APPROVED|REJECTED|PAID), submittedAt, resolvedAt, approvedFils?, rejectionReason?, documents[]`

## 6. CRM / Omnichannel Inbox

**Channel** — a connected platform account per clinic.
`clinicId, platform (WHATSAPP|INSTAGRAM|FACEBOOK), externalId (phone-number-id / IG business id / page id), displayName, accessTokenRef (encrypted, in secrets table), status (CONNECTED|EXPIRED|DISCONNECTED), webhookVerifiedAt`

**Contact** — a person on a platform, linkable to a Patient.
`organizationId, platform, externalUserId (wa_id / IGSID / PSID), displayName, phone?, avatarUrl?, patientId?`
> Linking: automatic by phone match for WhatsApp; manual "link to patient" action for IG/FB (they don't expose phone numbers).

**Conversation**
`channelId, contactId, status (OPEN|PENDING|RESOLVED|SNOOZED), assignedToUserId?, lastMessageAt, lastInboundAt (drives the 24h reply window), unreadCount, labels[]`

**Message**
`conversationId, direction (IN|OUT), externalMessageId, type (TEXT|IMAGE|AUDIO|VIDEO|DOCUMENT|TEMPLATE|STICKER|REACTION|UNSUPPORTED), body?, mediaS3Key?, templateName?, status (QUEUED|SENT|DELIVERED|READ|FAILED), failReason?, sentByUserId? (null for inbound/automated), at, raw (JSONB payload)`

**MessageTemplate** — WhatsApp-approved templates + internal quick replies.
`organizationId, name, platform, kind (WHATSAPP_TEMPLATE|QUICK_REPLY), language, body (with {{placeholders}}), metaTemplateId?, approvalStatus`

**Campaign** — broadcast to a patient segment.
`organizationId, name, templateId, segment (JSONB filter: tags, last-visit-before, upcoming-recall...), scheduledAt, status (DRAFT|SCHEDULED|RUNNING|DONE|CANCELLED), stats (JSONB sent/delivered/read/replied)`

**WebhookEvent** — raw inbound events for idempotency + replay.
`platform, externalEventId, payload (JSONB), receivedAt, processedAt?, error?`

## 7. Key Relationships (summary)

```
Organization ─┬─ Clinic ─┬─ Chair
              │          ├─ Appointment ── Patient, Provider
              │          ├─ Invoice ── InvoiceLine ── ProcedureCode
              │          └─ Channel ── Conversation ── Message
              ├─ Membership ── User
              ├─ Patient ─┬─ MedicalHistory / Document / ConsentForm
              │           ├─ ToothRecord / ChartEntry
              │           ├─ TreatmentPlan ── TreatmentPlanItem
              │           ├─ ClinicalNote / Prescription
              │           ├─ InsurancePolicy ── InsuranceClaim
              │           └─ Contact (platform identities)
              └─ ProcedureCode / MessageTemplate / Campaign / AuditEvent
```
