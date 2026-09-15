import { describe, expect, it } from "vitest";
import { createAppointmentSchema } from "./appointment";
import { deriveMedicalAlerts, medicalHistorySchema, patientSchema } from "./patient";

describe("patientSchema", () => {
  it("turns blank optional fields into undefined (not empty strings)", () => {
    const parsed = patientSchema.parse({
      firstName: "A",
      lastName: "B",
      dob: "",
      sex: "",
      cpr: "",
      phone: "",
      email: "",
      address: "",
      referralSource: "",
      notes: "",
      whatsappOptIn: true,
    });
    expect(parsed.dob).toBeUndefined();
    expect(parsed.sex).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.email).toBeUndefined();
  });

  it("still validates non-empty values", () => {
    expect(() => patientSchema.parse({ firstName: "A", lastName: "B", phone: "abc" })).toThrow();
    expect(() => patientSchema.parse({ firstName: "A", lastName: "B", email: "nope" })).toThrow();
  });
});

describe("createAppointmentSchema", () => {
  const base = {
    patientId: "p1",
    providerId: "pr1",
    clinicId: "c1",
    date: "2026-09-15",
    time: "16:00",
    durationMins: "30",
  };

  it("treats blank chair/type as undefined, never empty-string IDs", () => {
    const parsed = createAppointmentSchema.parse({ ...base, chairId: "", typeId: "", reason: "" });
    expect(parsed.chairId).toBeUndefined();
    expect(parsed.typeId).toBeUndefined();
    expect(parsed.durationMins).toBe(30);
  });
});

describe("deriveMedicalAlerts", () => {
  it("flags allergies, conditions, and anticoagulants", () => {
    const answers = medicalHistorySchema.parse({
      allergies: { penicillin: true, latex: false, localAnesthetic: false, other: "" },
      conditions: {
        diabetes: true,
        hypertension: false,
        heartDisease: false,
        asthma: false,
        bleedingDisorder: false,
        hepatitis: false,
        epilepsy: false,
        pregnancy: false,
      },
      medications: "Warfarin 5mg daily",
      smoker: false,
      notes: "",
    });
    expect(deriveMedicalAlerts(answers)).toEqual([
      "Penicillin allergy",
      "Diabetes",
      "Anticoagulant medication",
    ]);
  });
});
