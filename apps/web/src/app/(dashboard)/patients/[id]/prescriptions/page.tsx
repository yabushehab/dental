import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";
import { NewPrescriptionForm } from "./rx-form";

type RxItem = { drug: string; dose: string; frequency: string; duration: string };

export default async function PrescriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) notFound();

  const [prescriptions, providers, latestHistory] = await Promise.all([
    db.prescription.findMany({
      where: { patientId: id },
      include: { provider: { include: { membership: { include: { user: true } } } } },
      orderBy: { issuedAt: "desc" },
    }),
    db.provider.findMany({ include: { membership: { include: { user: true } } } }),
    db.medicalHistory.findFirst({ where: { patientId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  const alerts = latestHistory?.alerts ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold">Prescriptions — {fullName(patient)}</h1>

      {alerts.length > 0 && (
        <p className="mt-3 max-w-2xl rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">Check before prescribing: </span>
          {alerts.join(" · ")}
        </p>
      )}

      <div className="mt-4 max-w-2xl rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-800">New prescription</div>
        <NewPrescriptionForm
          patientId={patient.id}
          providers={providers.map((p) => ({ id: p.id, name: p.membership.user.name }))}
        />
      </div>

      <div className="mt-6 space-y-3">
        {prescriptions.map((rx) => {
          const items = (rx.items as RxItem[]) ?? [];
          return (
            <div key={rx.id} className="max-w-2xl rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-semibold">{rx.issuedAt.toISOString().slice(0, 10)}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {rx.provider.membership.user.name}
                  </span>
                </div>
                <Link
                  href={`/rx/${rx.id}/print`}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Print view →
                </Link>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-gray-800">
                {items.map((it, i) => (
                  <li key={i}>
                    <span className="font-medium">{it.drug}</span>
                    {it.dose && ` — ${it.dose}`}
                    {it.frequency && `, ${it.frequency}`}
                    {it.duration && `, for ${it.duration}`}
                  </li>
                ))}
              </ul>
              {rx.notes && <p className="mt-1 text-xs text-gray-500">{rx.notes}</p>}
            </div>
          );
        })}
        {prescriptions.length === 0 && (
          <p className="text-sm text-gray-400">No prescriptions yet.</p>
        )}
      </div>
    </div>
  );
}
