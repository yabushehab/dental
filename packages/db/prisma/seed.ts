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
