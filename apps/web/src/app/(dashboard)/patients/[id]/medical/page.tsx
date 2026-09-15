import { notFound } from "next/navigation";
import { medicalHistorySchema, type MedicalHistoryAnswers } from "@dentalos/shared";
import { MedicalHistoryForm } from "@/components/medical-history-form";
import { saveMedicalHistoryAction } from "@/lib/actions/patients";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";

export default async function MedicalHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({
    where: { id },
    include: { medicalHistories: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!patient || patient.deletedAt) notFound();

  const latest = patient.medicalHistories[0];
  let defaults: MedicalHistoryAnswers | null = null;
  if (latest) {
    const parsed = medicalHistorySchema.safeParse(latest.answers);
    if (parsed.success) defaults = parsed.data;
  }

  const action = saveMedicalHistoryAction.bind(null, patient.id);

  return (
    <div>
      <h1 className="text-xl font-semibold">Medical history — {fullName(patient)}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Saving writes a new version; earlier versions are kept for the record.
        {latest && ` Last updated ${latest.createdAt.toISOString().slice(0, 10)}.`}
      </p>
      <div className="mt-6">
        <MedicalHistoryForm action={action} defaults={defaults} />
      </div>
    </div>
  );
}
