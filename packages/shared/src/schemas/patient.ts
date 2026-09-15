import { z } from "zod";

/**
 * Form fields arrive as "" when left blank — normalize to undefined BEFORE
 * validation. (`z.string().optional().or(z.literal(""))…` does not work:
 * "" already satisfies the plain string schema.)
 */
export const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

export const patientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  dob: emptyToUndefined(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")),
  sex: emptyToUndefined(z.enum(["MALE", "FEMALE"])),
  cpr: emptyToUndefined(z.string().trim().max(20)),
  phone: emptyToUndefined(z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number")),
  email: emptyToUndefined(z.string().trim().toLowerCase().email("Invalid email")),
  address: emptyToUndefined(z.string().trim().max(300)),
  referralSource: emptyToUndefined(z.string().trim().max(120)),
  notes: emptyToUndefined(z.string().trim().max(2000)),
  whatsappOptIn: z.boolean().default(true),
});
export type PatientInput = z.infer<typeof patientSchema>;

/** Structured medical questionnaire (stored as MedicalHistory.answers). */
export const medicalHistorySchema = z.object({
  allergies: z.object({
    penicillin: z.boolean().default(false),
    latex: z.boolean().default(false),
    localAnesthetic: z.boolean().default(false),
    other: z.string().trim().max(300).default(""),
  }),
  conditions: z.object({
    diabetes: z.boolean().default(false),
    hypertension: z.boolean().default(false),
    heartDisease: z.boolean().default(false),
    asthma: z.boolean().default(false),
    bleedingDisorder: z.boolean().default(false),
    hepatitis: z.boolean().default(false),
    epilepsy: z.boolean().default(false),
    pregnancy: z.boolean().default(false),
  }),
  medications: z.string().trim().max(1000).default(""),
  smoker: z.boolean().default(false),
  notes: z.string().trim().max(2000).default(""),
});
export type MedicalHistoryAnswers = z.infer<typeof medicalHistorySchema>;

const ANTICOAGULANTS = /warfarin|marevan|coumadin|xarelto|rivaroxaban|eliquis|apixaban|plavix|clopidogrel|aspirin|heparin/i;

/** Red-banner alerts derived from questionnaire answers. */
export function deriveMedicalAlerts(answers: MedicalHistoryAnswers): string[] {
  const alerts: string[] = [];
  if (answers.allergies.penicillin) alerts.push("Penicillin allergy");
  if (answers.allergies.latex) alerts.push("Latex allergy");
  if (answers.allergies.localAnesthetic) alerts.push("Local anesthetic allergy");
  if (answers.allergies.other) alerts.push(`Allergy: ${answers.allergies.other}`);
  if (answers.conditions.diabetes) alerts.push("Diabetes");
  if (answers.conditions.hypertension) alerts.push("Hypertension");
  if (answers.conditions.heartDisease) alerts.push("Heart disease");
  if (answers.conditions.bleedingDisorder) alerts.push("Bleeding disorder");
  if (answers.conditions.hepatitis) alerts.push("Hepatitis");
  if (answers.conditions.epilepsy) alerts.push("Epilepsy");
  if (answers.conditions.pregnancy) alerts.push("Pregnancy");
  if (ANTICOAGULANTS.test(answers.medications)) alerts.push("Anticoagulant medication");
  return alerts;
}
