import Link from "next/link";
import { notFound } from "next/navigation";
import { APPOINTMENT_STATUS_LABELS, formatTime12h, type AppointmentStatusValue } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { age, fileNo, formatDate, fullName } from "@/lib/format";

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db, organization } = await requireOrgContext();
  const { id } = await params;

  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      medicalHistories: { orderBy: { createdAt: "desc" }, take: 1 },
      appointments: {
        where: { startsAt: { gte: new Date() }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { provider: { include: { membership: { include: { user: true } } } }, type: true },
      },
    },
  });
  if (!patient || patient.deletedAt) notFound();

  const history = patient.medicalHistories[0];
  const alerts = history?.alerts ?? [];
  const tz = organization.timezone;

  const details: Array<[string, string]> = [
    ["Date of birth", `${formatDate(patient.dob)}${age(patient.dob) !== null ? ` (${age(patient.dob)} y)` : ""}`],
    ["Sex", patient.sex === "MALE" ? "Male" : patient.sex === "FEMALE" ? "Female" : "—"],
    ["Phone", patient.phone ?? "—"],
    ["Email", patient.email ?? "—"],
    ["CPR / ID", patient.cpr ?? "—"],
    ["Address", patient.address ?? "—"],
    ["Referral source", patient.referralSource ?? "—"],
    ["WhatsApp opt-in", patient.whatsappOptIn ? "Yes" : "No"],
  ];

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {fullName(patient)}{" "}
            <span className="ml-1 font-mono text-sm font-normal text-gray-400">
              {fileNo(patient.fileNumber)}
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Registered {patient.createdAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/patients/${patient.id}/medical`}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Medical history
          </Link>
          <Link
            href={`/patients/${patient.id}/documents`}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Documents
          </Link>
          <Link
            href={`/patients/${patient.id}/edit`}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Edit
          </Link>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm font-semibold text-red-800">Medical alerts</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {alerts.map((a) => (
              <span
                key={a}
                className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold">Details</div>
          <dl className="divide-y divide-gray-100">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className="max-w-[60%] text-right font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          {patient.notes && (
            <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
              <span className="font-medium text-gray-800">Notes: </span>
              {patient.notes}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold">Upcoming appointments</span>
            <Link href="/schedule" className="text-xs font-medium text-brand-600 hover:underline">
              Open schedule →
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {patient.appointments.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900">
                    {a.startsAt.toISOString().slice(0, 10)} · {formatTime12h(a.startsAt, tz)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {a.type?.name ?? "Appointment"} · {a.provider.membership.user.name}
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {APPOINTMENT_STATUS_LABELS[a.status as AppointmentStatusValue]}
                </span>
              </li>
            ))}
            {patient.appointments.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                No upcoming appointments
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
