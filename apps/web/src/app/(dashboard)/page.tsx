import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@dentalos/db";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  // layout guarantees these
  const org = user!.organization!;

  const clinicCount = await prisma.clinic.count({
    where: { organizationId: org.id, isActive: true },
  });
  const staffCount = await prisma.membership.count({
    where: { organizationId: org.id, isActive: true },
  });

  const stats = [
    { label: "Branches", value: clinicCount },
    { label: "Staff members", value: staffCount },
    { label: "Patients", value: "—", note: "Phase 1" },
    { label: "Appointments today", value: "—", note: "Phase 1" },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        {org.name} · {org.currency} · {org.timezone}
        {org.plan === "TRIAL" && org.trialEndsAt && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Trial until {org.trialEndsAt.toISOString().slice(0, 10)}
          </span>
        )}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
            {s.note && <div className="mt-1 text-xs text-gray-400">coming in {s.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
