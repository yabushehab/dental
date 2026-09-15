"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deriveMedicalAlerts,
  medicalHistorySchema,
  patientSchema,
} from "@dentalos/shared";
import { nextCounterValue, requireOrgContext } from "../org";

export type PatientFormState = { error?: string };

function parsePatientForm(formData: FormData) {
  return patientSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dob: formData.get("dob") ?? "",
    sex: formData.get("sex") ?? "",
    cpr: formData.get("cpr") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    referralSource: formData.get("referralSource") ?? "",
    notes: formData.get("notes") ?? "",
    whatsappOptIn: formData.get("whatsappOptIn") === "on",
  });
}

export async function createPatientAction(
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const { db, organization, user } = await requireOrgContext();

  const parsed = parsePatientForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  const fileNumber = await nextCounterValue(db, organization.id, "patientFile", 1001);
  const patient = await db.patient.create({
    data: {
      organizationId: organization.id,
      fileNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob ? new Date(input.dob) : null,
      sex: input.sex ?? null,
      cpr: input.cpr ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      referralSource: input.referralSource ?? null,
      notes: input.notes ?? null,
      whatsappOptIn: input.whatsappOptIn,
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "patient.created",
      entityType: "Patient",
      entityId: patient.id,
      after: { fileNumber, name: `${input.firstName} ${input.lastName}` },
    },
  });

  redirect(`/patients/${patient.id}`);
}

export async function updatePatientAction(
  patientId: string,
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const { db, organization, user } = await requireOrgContext();

  const parsed = parsePatientForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  const before = await db.patient.findUnique({ where: { id: patientId } });
  if (!before || before.deletedAt) return { error: "Patient not found" };

  await db.patient.update({
    where: { id: patientId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob ? new Date(input.dob) : null,
      sex: input.sex ?? null,
      cpr: input.cpr ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      referralSource: input.referralSource ?? null,
      notes: input.notes ?? null,
      whatsappOptIn: input.whatsappOptIn,
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "patient.updated",
      entityType: "Patient",
      entityId: patientId,
      before: { firstName: before.firstName, lastName: before.lastName, phone: before.phone },
      after: { firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null },
    },
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function saveMedicalHistoryAction(
  patientId: string,
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const { db, organization, user } = await requireOrgContext();

  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.deletedAt) return { error: "Patient not found" };

  const on = (name: string) => formData.get(name) === "on";
  const parsed = medicalHistorySchema.safeParse({
    allergies: {
      penicillin: on("allergies.penicillin"),
      latex: on("allergies.latex"),
      localAnesthetic: on("allergies.localAnesthetic"),
      other: formData.get("allergies.other") ?? "",
    },
    conditions: {
      diabetes: on("conditions.diabetes"),
      hypertension: on("conditions.hypertension"),
      heartDisease: on("conditions.heartDisease"),
      asthma: on("conditions.asthma"),
      bleedingDisorder: on("conditions.bleedingDisorder"),
      hepatitis: on("conditions.hepatitis"),
      epilepsy: on("conditions.epilepsy"),
      pregnancy: on("conditions.pregnancy"),
    },
    medications: formData.get("medications") ?? "",
    smoker: on("smoker"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const alerts = deriveMedicalAlerts(parsed.data);
  await db.medicalHistory.create({
    data: {
      organizationId: organization.id,
      patientId,
      answers: parsed.data,
      alerts,
      completedByUserId: user.id,
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "medicalHistory.updated",
      entityType: "Patient",
      entityId: patientId,
      after: { alerts },
    },
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}
