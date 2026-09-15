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
