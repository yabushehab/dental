"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TOOTH_SURFACES, emptyToUndefined, isValidFdi, parseAmount } from "@dentalos/shared";
import { requirePermission } from "../rbac";
import { orgScoped, prisma } from "@dentalos/db";

export type ClinicalFormState = { error?: string };

async function clinicalCtx(permission: "clinical:write" | "clinical:sign" = "clinical:write") {
  const { organization, user, membership } = await requirePermission(permission);
  const db = orgScoped(prisma, organization.id);
  const provider = await db.provider.findFirst({ where: { membershipId: membership.id } });
  return { db, organization, user, membership, provider };
}

function parseSurfaces(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is (typeof TOOTH_SURFACES)[number] =>
      (TOOTH_SURFACES as readonly string[]).includes(s),
    );
}

// --- Chart -----------------------------------------------------------------

export async function addChartEntryAction(
  patientId: string,
  _prev: ClinicalFormState,
  formData: FormData,
): Promise<ClinicalFormState> {
  const { db, organization, user, provider } = await clinicalCtx();

  const parsed = z
    .object({
      kind: z.enum(["FINDING", "PLANNED", "COMPLETED"]),
      toothFdi: emptyToUndefined(z.coerce.number().int()),
      surfaces: z.string().default(""),
      procedureCodeId: emptyToUndefined(z.string().min(1)),
      providerId: emptyToUndefined(z.string().min(1)),
      description: emptyToUndefined(z.string().trim().max(500)),
    })
    .safeParse({
      kind: formData.get("kind"),
      toothFdi: formData.get("toothFdi") ?? "",
      surfaces: formData.get("surfaces") ?? "",
      procedureCodeId: formData.get("procedureCodeId") ?? "",
      providerId: formData.get("providerId") ?? "",
      description: formData.get("description") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  if (input.toothFdi !== undefined && !isValidFdi(input.toothFdi)) {
    return { error: `Invalid FDI tooth number: ${input.toothFdi}` };
  }

  let description = input.description;
  if (!description && input.procedureCodeId) {
    const code = await db.procedureCode.findUnique({ where: { id: input.procedureCodeId } });
    description = code?.name;
  }
  if (!description) return { error: "Add a description or pick a procedure" };

  await db.chartEntry.create({
    data: {
      organizationId: organization.id,
      patientId,
      toothFdi: input.toothFdi ?? null,
      surfaces: parseSurfaces(input.surfaces),
      kind: input.kind,
      procedureCodeId: input.procedureCodeId ?? null,
      providerId: input.providerId ?? provider?.id ?? null,
      description,
      enteredByUserId: user.id,
    },
  });

  revalidatePath(`/patients/${patientId}/chart`);
  return {};
}

export async function setToothStatusAction(
  patientId: string,
  _prev: ClinicalFormState,
  formData: FormData,
): Promise<ClinicalFormState> {
  const { db, organization } = await clinicalCtx();

  const parsed = z
    .object({
      toothFdi: z.coerce.number().int(),
      status: z.enum(["PRESENT", "MISSING", "EXTRACTED", "IMPLANT", "UNERUPTED"]),
    })
    .safeParse({ toothFdi: formData.get("toothFdi"), status: formData.get("status") });
  if (!parsed.success) return { error: "Pick a tooth and a status" };
  if (!isValidFdi(parsed.data.toothFdi)) return { error: "Invalid tooth number" };

  await db.toothRecord.upsert({
    where: { patientId_toothFdi: { patientId, toothFdi: parsed.data.toothFdi } },
    create: {
      organizationId: organization.id,
      patientId,
      toothFdi: parsed.data.toothFdi,
      status: parsed.data.status,
    },
    update: { status: parsed.data.status },
  });

  revalidatePath(`/patients/${patientId}/chart`);
  return {};
}

// --- Treatment plans ---------------------------------------------------------

export async function createPlanAction(patientId: string, formData: FormData): Promise<void> {
  const { db, organization, provider } = await clinicalCtx();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const plan = await db.treatmentPlan.create({
    data: {
      organizationId: organization.id,
      patientId,
      providerId: provider?.id ?? null,
      title,
    },
  });
  redirect(`/patients/${patientId}/plans/${plan.id}`);
}

export async function addPlanItemAction(
  planId: string,
  _prev: ClinicalFormState,
  formData: FormData,
): Promise<ClinicalFormState> {
  const { db, organization, user, provider } = await clinicalCtx();

  const plan = await db.treatmentPlan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Plan not found" };
  if (["COMPLETED", "CANCELLED"].includes(plan.status)) {
    return { error: "This plan is closed" };
  }

  const parsed = z
    .object({
      procedureCodeId: z.string().min(1, "Pick a procedure"),
      toothFdi: emptyToUndefined(z.coerce.number().int()),
      surfaces: z.string().default(""),
      phase: z.coerce.number().int().min(1).max(20).default(1),
      price: emptyToUndefined(z.string().trim()),
    })
    .safeParse({
      procedureCodeId: formData.get("procedureCodeId"),
      toothFdi: formData.get("toothFdi") ?? "",
      surfaces: formData.get("surfaces") ?? "",
      phase: formData.get("phase") ?? "1",
      price: formData.get("price") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  if (input.toothFdi !== undefined && !isValidFdi(input.toothFdi)) {
    return { error: `Invalid FDI tooth number: ${input.toothFdi}` };
  }

  const code = await db.procedureCode.findUnique({ where: { id: input.procedureCodeId } });
  if (!code) return { error: "Procedure not found" };

  let priceFils = code.defaultPriceFils;
  if (input.price) {
    try {
      priceFils = parseAmount(input.price);
    } catch {
      return { error: "Invalid price — use BHD like 25.000" };
    }
  }

  const item = await db.treatmentPlanItem.create({
    data: {
      organizationId: organization.id,
      planId,
      procedureCodeId: code.id,
      toothFdi: input.toothFdi ?? null,
      surfaces: parseSurfaces(input.surfaces),
      phase: input.phase,
      priceFils,
      vatRate: code.vatRate,
    },
  });
  // planned work shows on the tooth chart immediately
  await db.chartEntry.create({
    data: {
      organizationId: organization.id,
      patientId: plan.patientId,
      toothFdi: input.toothFdi ?? null,
      surfaces: parseSurfaces(input.surfaces),
      kind: "PLANNED",
      procedureCodeId: code.id,
      providerId: plan.providerId ?? provider?.id ?? null,
      treatmentPlanItemId: item.id,
      description: code.name,
      enteredByUserId: user.id,
    },
  });

  revalidatePath(`/patients/${plan.patientId}/plans/${planId}`);
  return {};
}

const PLAN_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PROPOSED", "CANCELLED"],
  PROPOSED: ["ACCEPTED", "DRAFT", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updatePlanStatusAction(planId: string, status: string): Promise<void> {
  const { db, user, organization } = await clinicalCtx();
  const plan = await db.treatmentPlan.findUnique({ where: { id: planId } });
  if (!plan) return;
  if (!PLAN_TRANSITIONS[plan.status]?.includes(status)) return;

  await db.treatmentPlan.update({
    where: { id: planId },
    data: {
      status: status as never,
      ...(status === "PROPOSED" ? { presentedAt: new Date() } : {}),
      ...(status === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: `treatmentPlan.${status.toLowerCase()}`,
      entityType: "TreatmentPlan",
      entityId: planId,
      before: { status: plan.status },
      after: { status },
    },
  });
  revalidatePath(`/patients/${plan.patientId}/plans/${planId}`);
}

export async function completePlanItemAction(itemId: string): Promise<void> {
  const { db, organization, user, provider } = await clinicalCtx();
  const item = await db.treatmentPlanItem.findUnique({
    where: { id: itemId },
    include: { plan: true, procedureCode: true },
  });
  if (!item || item.status !== "PENDING") return;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(item.plan.status)) return;

  await db.treatmentPlanItem.update({
    where: { id: itemId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await db.chartEntry.create({
    data: {
      organizationId: organization.id,
      patientId: item.plan.patientId,
      toothFdi: item.toothFdi,
      surfaces: item.surfaces,
      kind: "COMPLETED",
      procedureCodeId: item.procedureCodeId,
      providerId: item.plan.providerId ?? provider?.id ?? null,
      treatmentPlanItemId: item.id,
      description: item.procedureCode.name,
      enteredByUserId: user.id,
    },
  });
  if (item.plan.status === "ACCEPTED") {
    await db.treatmentPlan.update({ where: { id: item.planId }, data: { status: "IN_PROGRESS" } });
  }
  // close the plan automatically when the last item is done
  const remaining = await db.treatmentPlanItem.count({
    where: { planId: item.planId, status: "PENDING" },
  });
  if (remaining === 0) {
    await db.treatmentPlan.update({ where: { id: item.planId }, data: { status: "COMPLETED" } });
  }
  revalidatePath(`/patients/${item.plan.patientId}/plans/${item.planId}`);
}

export async function cancelPlanItemAction(itemId: string): Promise<void> {
  const { db } = await clinicalCtx();
  const item = await db.treatmentPlanItem.findUnique({
    where: { id: itemId },
    include: { plan: true },
  });
  if (!item || item.status !== "PENDING") return;
  await db.treatmentPlanItem.update({ where: { id: itemId }, data: { status: "CANCELLED" } });
  revalidatePath(`/patients/${item.plan.patientId}/plans/${item.planId}`);
}

// --- Clinical notes ----------------------------------------------------------

export async function createNoteAction(
  patientId: string,
  _prev: ClinicalFormState,
  formData: FormData,
): Promise<ClinicalFormState> {
  const { db, organization, provider } = await clinicalCtx();

  const providerId = String(formData.get("providerId") || provider?.id || "");
  if (!providerId) return { error: "Pick a provider" };

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const note = {
    subjective: text("subjective"),
    objective: text("objective"),
    assessment: text("assessment"),
    plan: text("plan"),
  };
  if (!note.subjective && !note.objective && !note.assessment && !note.plan) {
    return { error: "Write something in at least one section" };
  }

  await db.clinicalNote.create({
    data: { organizationId: organization.id, patientId, providerId, ...note },
  });
  revalidatePath(`/patients/${patientId}/notes`);
  return {};
}

export async function signNoteAction(noteId: string): Promise<void> {
  const { db, user, organization } = await clinicalCtx("clinical:sign");
  const note = await db.clinicalNote.findUnique({ where: { id: noteId } });
  if (!note || note.signedAt) return;

  await db.clinicalNote.update({
    where: { id: noteId },
    data: { signedAt: new Date(), signedByUserId: user.id },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "clinicalNote.signed",
      entityType: "ClinicalNote",
      entityId: noteId,
    },
  });
  revalidatePath(`/patients/${note.patientId}/notes`);
}

export async function amendNoteAction(
  noteId: string,
  _prev: ClinicalFormState,
  formData: FormData,
): Promise<ClinicalFormState> {
  const { db, organization, user } = await clinicalCtx();
  const note = await db.clinicalNote.findUnique({ where: { id: noteId } });
  if (!note) return { error: "Note not found" };
  if (!note.signedAt) return { error: "Unsigned notes can be edited directly" };

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Amendment text is required" };

  await db.noteAmendment.create({
    data: { organizationId: organization.id, noteId, text, byUserId: user.id },
  });
  revalidatePath(`/patients/${note.patientId}/notes`);
  return {};
}

// --- Prescriptions -------------------------------------------------------------

export async function createPrescriptionAction(
  patientId: string,
  _prev: ClinicalFormState,
  formData: FormData,
): Promise<ClinicalFormState> {
  const { db, organization, provider } = await clinicalCtx();

  const providerId = String(formData.get("providerId") || provider?.id || "");
  if (!providerId) return { error: "Pick a provider" };

  const drugs = formData.getAll("drug").map(String);
  const doses = formData.getAll("dose").map(String);
  const freqs = formData.getAll("frequency").map(String);
  const durs = formData.getAll("duration").map(String);
  const items = drugs
    .map((drug, i) => ({
      drug: drug.trim(),
      dose: (doses[i] ?? "").trim(),
      frequency: (freqs[i] ?? "").trim(),
      duration: (durs[i] ?? "").trim(),
    }))
    .filter((it) => it.drug);
  if (items.length === 0) return { error: "Add at least one medication" };

  const rx = await db.prescription.create({
    data: {
      organizationId: organization.id,
      patientId,
      providerId,
      items,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  redirect(`/rx/${rx.id}/print`);
}
