import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const org = await prisma.organization.upsert({
    where: { slug: "smile-dental" },
    update: {},
    create: {
      name: "Smile Dental Center",
      slug: "smile-dental",
      country: "BH",
      currency: "BHD",
      currencyExponent: 3,
      timezone: "Asia/Bahrain",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const clinic = await prisma.clinic.findFirst({
    where: { organizationId: org.id, name: "Main Branch — Manama" },
  });
  if (!clinic) {
    await prisma.clinic.create({
      data: {
        organizationId: org.id,
        name: "Main Branch — Manama",
        phone: "+97317000000",
        workingHours: {
          sun: [{ start: "09:00", end: "18:00" }],
          mon: [{ start: "09:00", end: "18:00" }],
          tue: [{ start: "09:00", end: "18:00" }],
          wed: [{ start: "09:00", end: "18:00" }],
          thu: [{ start: "09:00", end: "18:00" }],
          fri: [],
          sat: [{ start: "09:00", end: "14:00" }],
        },
      },
    });
  }

  const staff: Array<{ email: string; name: string; role: "OWNER" | "DENTIST" | "RECEPTIONIST" }> =
    [
      { email: "owner@demo.test", name: "Dr. Ahmed Al-Sayed", role: "OWNER" },
      { email: "dentist@demo.test", name: "Dr. Layla Hassan", role: "DENTIST" },
      { email: "reception@demo.test", name: "Sara Yousif", role: "RECEPTIONIST" },
    ];

  for (const s of staff) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { email: s.email, name: s.name, passwordHash },
    });
    const membership = await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: {},
      create: { userId: user.id, organizationId: org.id, role: s.role },
    });
    if ((s.role === "OWNER" || s.role === "DENTIST") && membership) {
      await prisma.provider.upsert({
        where: { membershipId: membership.id },
        update: {},
        create: {
          membershipId: membership.id,
          organizationId: org.id,
          title: "Dr.",
          specialty: s.role === "OWNER" ? "General Dentistry" : "Endodontics",
        },
      });
    }
  }

  // --- Phase 1: chairs, appointment types, patients, appointments ---------
  const mainClinic = await prisma.clinic.findFirstOrThrow({
    where: { organizationId: org.id },
  });

  for (const name of ["Chair 1", "Chair 2", "Chair 3"]) {
    const exists = await prisma.chair.findFirst({
      where: { organizationId: org.id, clinicId: mainClinic.id, name },
    });
    if (!exists) {
      await prisma.chair.create({
        data: { organizationId: org.id, clinicId: mainClinic.id, name },
      });
    }
  }

  const typeDefs = [
    { name: "Consultation", defaultMins: 30, color: "#3b82f6" },
    { name: "Checkup & Cleaning", defaultMins: 45, color: "#10b981" },
    { name: "Filling", defaultMins: 45, color: "#f59e0b" },
    { name: "Root Canal", defaultMins: 90, color: "#ef4444" },
    { name: "Extraction", defaultMins: 60, color: "#8b5cf6" },
    { name: "Whitening", defaultMins: 60, color: "#06b6d4" },
  ];
  for (const t of typeDefs) {
    const exists = await prisma.appointmentType.findFirst({
      where: { organizationId: org.id, name: t.name },
    });
    if (!exists) {
      await prisma.appointmentType.create({ data: { organizationId: org.id, ...t } });
    }
  }

  const patientDefs = [
    { firstName: "Mohammed", lastName: "Al-Khalifa", phone: "+97336000001", sex: "MALE", dob: "1985-04-12", alerts: ["Penicillin allergy"], answers: { allergies: { penicillin: true } } },
    { firstName: "Fatima", lastName: "Hasan", phone: "+97336000002", sex: "FEMALE", dob: "1992-11-03", alerts: [], answers: {} },
    { firstName: "Ali", lastName: "Mahmood", phone: "+97336000003", sex: "MALE", dob: "1978-01-25", alerts: ["Diabetes", "Hypertension"], answers: { conditions: { diabetes: true, hypertension: true } } },
    { firstName: "Noora", lastName: "Abdulla", phone: "+97336000004", sex: "FEMALE", dob: "2001-07-19", alerts: [], answers: {} },
    { firstName: "Khalid", lastName: "Janahi", phone: "+97336000005", sex: "MALE", dob: "1969-09-30", alerts: ["Anticoagulant medication"], answers: { medications: "Warfarin 5mg" } },
    { firstName: "Maryam", lastName: "Fakhro", phone: "+97336000006", sex: "FEMALE", dob: "1995-02-14", alerts: [], answers: {} },
    { firstName: "Hussain", lastName: "Kadhem", phone: "+97336000007", sex: "MALE", dob: "1988-12-08", alerts: [], answers: {} },
    { firstName: "Zainab", lastName: "Ashoor", phone: "+97336000008", sex: "FEMALE", dob: "1990-06-22", alerts: ["Pregnancy"], answers: { conditions: { pregnancy: true } } },
  ] as const;

  const patients = [];
  for (const [i, p] of patientDefs.entries()) {
    let patient = await prisma.patient.findFirst({
      where: { organizationId: org.id, phone: p.phone },
    });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          organizationId: org.id,
          fileNumber: 1001 + i,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          sex: p.sex,
          dob: new Date(p.dob),
          primaryClinicId: mainClinic.id,
        },
      });
      await prisma.medicalHistory.create({
        data: {
          organizationId: org.id,
          patientId: patient.id,
          answers: p.answers,
          alerts: [...p.alerts],
        },
      });
    }
    patients.push(patient);
  }
  await prisma.counter.upsert({
    where: { organizationId_key: { organizationId: org.id, key: "patientFile" } },
    update: {},
    create: { organizationId: org.id, key: "patientFile", value: 1000 + patientDefs.length },
  });

  // appointments: today + tomorrow across both providers (times are UTC;
  // Bahrain is UTC+3, so 05:00Z = 08:00 local)
  const providers = await prisma.provider.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
  });
  const chairs = await prisma.chair.findMany({
    where: { organizationId: org.id },
    orderBy: { name: "asc" },
  });
  const types = await prisma.appointmentType.findMany({ where: { organizationId: org.id } });
  const typeByName = new Map(types.map((t) => [t.name, t]));

  const existingAppts = await prisma.appointment.count({ where: { organizationId: org.id } });
  if (existingAppts === 0 && providers.length >= 2 && patients.length >= 8) {
    const today = new Date();
    const day = (offset: number, h: number, m: number) => {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset, h, m));
      return d;
    };
    const mins = (d: Date, n: number) => new Date(d.getTime() + n * 60_000);

    const plan: Array<{
      p: number; prov: number; chair: number; type: string; off: number; h: number; m: number;
      status?: "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED";
    }> = [
      { p: 0, prov: 0, chair: 0, type: "Checkup & Cleaning", off: 0, h: 5, m: 0, status: "COMPLETED" },
      { p: 1, prov: 0, chair: 0, type: "Filling", off: 0, h: 6, m: 0, status: "CHECKED_IN" },
      { p: 2, prov: 0, chair: 1, type: "Root Canal", off: 0, h: 7, m: 30, status: "CONFIRMED" },
      { p: 3, prov: 1, chair: 2, type: "Consultation", off: 0, h: 6, m: 30, status: "CONFIRMED" },
      { p: 4, prov: 1, chair: 2, type: "Extraction", off: 0, h: 9, m: 0 },
      { p: 5, prov: 0, chair: 0, type: "Whitening", off: 1, h: 5, m: 30 },
      { p: 6, prov: 1, chair: 1, type: "Checkup & Cleaning", off: 1, h: 7, m: 0 },
      { p: 7, prov: 1, chair: 2, type: "Consultation", off: 1, h: 10, m: 0 },
    ];
    for (const a of plan) {
      const type = typeByName.get(a.type);
      const startsAt = day(a.off, a.h, a.m);
      await prisma.appointment.create({
        data: {
          organizationId: org.id,
          clinicId: mainClinic.id,
          patientId: patients[a.p]!.id,
          providerId: providers[a.prov]!.id,
          chairId: chairs[a.chair]?.id,
          typeId: type?.id,
          startsAt,
          endsAt: mins(startsAt, type?.defaultMins ?? 30),
          status: a.status ?? "SCHEDULED",
        },
      });
    }
  }

  // --- Phase 2: procedure catalog + demo clinical data ---------------------
  // prices in fils (BHD*1000); vatRate 0 = zero-rated healthcare, 10 = cosmetic
  const procedureDefs: Array<{
    code: string; name: string; category:
      | "DIAGNOSTIC" | "PREVENTIVE" | "RESTORATIVE" | "ENDO" | "PERIO"
      | "PROSTHO" | "ORTHO" | "SURGERY" | "IMPLANT" | "COSMETIC";
    priceFils: number; vatRate?: number; mins?: number; perTooth?: boolean;
  }> = [
    { code: "D0110", name: "Comprehensive oral examination", category: "DIAGNOSTIC", priceFils: 15000, mins: 30 },
    { code: "D0220", name: "Periapical X-ray", category: "DIAGNOSTIC", priceFils: 5000, mins: 10, perTooth: true },
    { code: "D0330", name: "Panoramic X-ray (OPG)", category: "DIAGNOSTIC", priceFils: 15000, mins: 15 },
    { code: "D1110", name: "Scaling & polishing", category: "PREVENTIVE", priceFils: 25000, mins: 45 },
    { code: "D1206", name: "Fluoride application", category: "PREVENTIVE", priceFils: 10000, mins: 15 },
    { code: "D1351", name: "Fissure sealant", category: "PREVENTIVE", priceFils: 12000, mins: 20, perTooth: true },
    { code: "D2391", name: "Composite filling — one surface", category: "RESTORATIVE", priceFils: 25000, mins: 45, perTooth: true },
    { code: "D2392", name: "Composite filling — two surfaces", category: "RESTORATIVE", priceFils: 35000, mins: 60, perTooth: true },
    { code: "D2393", name: "Composite filling — three+ surfaces", category: "RESTORATIVE", priceFils: 45000, mins: 60, perTooth: true },
    { code: "D3310", name: "Root canal — anterior", category: "ENDO", priceFils: 80000, mins: 90, perTooth: true },
    { code: "D3320", name: "Root canal — premolar", category: "ENDO", priceFils: 100000, mins: 90, perTooth: true },
    { code: "D3330", name: "Root canal — molar", category: "ENDO", priceFils: 130000, mins: 120, perTooth: true },
    { code: "D4341", name: "Deep scaling / root planing (per quadrant)", category: "PERIO", priceFils: 30000, mins: 45 },
    { code: "D2740", name: "Zirconia crown", category: "PROSTHO", priceFils: 150000, mins: 60, perTooth: true },
    { code: "D5110", name: "Complete denture (upper)", category: "PROSTHO", priceFils: 350000, mins: 60 },
    { code: "D7140", name: "Simple extraction", category: "SURGERY", priceFils: 20000, mins: 30, perTooth: true },
    { code: "D7240", name: "Surgical extraction — impacted", category: "SURGERY", priceFils: 80000, mins: 60, perTooth: true },
    { code: "D6010", name: "Implant placement", category: "IMPLANT", priceFils: 400000, mins: 90, perTooth: true },
    { code: "D9972", name: "Teeth whitening (in-office)", category: "COSMETIC", priceFils: 120000, vatRate: 10, mins: 60 },
    { code: "D9973", name: "Composite veneer", category: "COSMETIC", priceFils: 60000, vatRate: 10, mins: 60, perTooth: true },
  ];
  for (const pd of procedureDefs) {
    await prisma.procedureCode.upsert({
      where: { organizationId_code: { organizationId: org.id, code: pd.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: pd.code,
        name: pd.name,
        category: pd.category,
        defaultPriceFils: pd.priceFils,
        vatRate: pd.vatRate ?? 0,
        defaultMins: pd.mins ?? null,
        isPerTooth: pd.perTooth ?? false,
      },
    });
  }

  // demo clinical data for Mohammed Al-Khalifa (patient 0)
  const demoPatient = patients[0];
  const demoProvider = providers[0];
  const codeByCode = new Map(
    (await prisma.procedureCode.findMany({ where: { organizationId: org.id } })).map((c) => [c.code, c]),
  );
  if (demoPatient && demoProvider) {
    const hasChart = await prisma.chartEntry.count({
      where: { organizationId: org.id, patientId: demoPatient.id },
    });
    if (hasChart === 0) {
      await prisma.toothRecord.create({
        data: { organizationId: org.id, patientId: demoPatient.id, toothFdi: 18, status: "MISSING" },
      });
      await prisma.chartEntry.createMany({
        data: [
          {
            organizationId: org.id, patientId: demoPatient.id, toothFdi: 36,
            surfaces: ["O", "M"], kind: "FINDING", description: "Deep caries, sensitive to cold",
            providerId: demoProvider.id,
          },
          {
            organizationId: org.id, patientId: demoPatient.id, toothFdi: 36,
            surfaces: ["O", "M"], kind: "PLANNED", description: "Root canal + crown",
            procedureCodeId: codeByCode.get("D3330")?.id, providerId: demoProvider.id,
          },
          {
            organizationId: org.id, patientId: demoPatient.id, toothFdi: 24,
            surfaces: ["O"], kind: "COMPLETED", description: "Composite filling placed",
            procedureCodeId: codeByCode.get("D2391")?.id, providerId: demoProvider.id,
          },
        ],
      });

      const plan = await prisma.treatmentPlan.create({
        data: {
          organizationId: org.id, patientId: demoPatient.id, providerId: demoProvider.id,
          title: "Tooth 36 restoration", status: "ACCEPTED",
          presentedAt: new Date(), acceptedAt: new Date(),
        },
      });
      const rc = codeByCode.get("D3330");
      const crown = codeByCode.get("D2740");
      if (rc && crown) {
        await prisma.treatmentPlanItem.createMany({
          data: [
            {
              organizationId: org.id, planId: plan.id, procedureCodeId: rc.id,
              toothFdi: 36, surfaces: ["O", "M"], phase: 1,
              priceFils: rc.defaultPriceFils, vatRate: rc.vatRate,
            },
            {
              organizationId: org.id, planId: plan.id, procedureCodeId: crown.id,
              toothFdi: 36, phase: 2,
              priceFils: crown.defaultPriceFils, vatRate: crown.vatRate,
            },
          ],
        });
      }

      const ownerUser = await prisma.user.findUnique({ where: { email: "owner@demo.test" } });
      await prisma.clinicalNote.create({
        data: {
          organizationId: org.id, patientId: demoPatient.id, providerId: demoProvider.id,
          subjective: "Patient reports sharp pain in lower left molar when drinking cold water, 2 weeks.",
          objective: "Tooth 36: deep occlusal-mesial caries. Cold test: lingering pain. Percussion: mild tenderness.",
          assessment: "Irreversible pulpitis, tooth 36.",
          plan: "Root canal treatment 36, then zirconia crown. Amoxicillin not indicated. Review in 1 week.",
          signedAt: new Date(), signedByUserId: ownerUser?.id ?? null,
        },
      });
      await prisma.prescription.create({
        data: {
          organizationId: org.id, patientId: demoPatient.id, providerId: demoProvider.id,
          items: [
            { drug: "Ibuprofen 400mg", dose: "1 tablet", frequency: "every 8 hours", duration: "5 days" },
            { drug: "Chlorhexidine 0.12% mouthwash", dose: "15ml rinse", frequency: "twice daily", duration: "7 days" },
          ],
          notes: "Take ibuprofen after food. Avoid penicillin — allergy on record.",
        },
      });
    }
  }

  console.log("Seeded demo organization:");
  console.log("  owner@demo.test / password123 (OWNER)");
  console.log("  dentist@demo.test / password123 (DENTIST)");
  console.log("  reception@demo.test / password123 (RECEPTIONIST)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
