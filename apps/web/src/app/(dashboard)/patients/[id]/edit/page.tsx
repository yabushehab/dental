import { notFound } from "next/navigation";
import { PatientForm } from "@/components/patient-form";
import { updatePatientAction } from "@/lib/actions/patients";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) notFound();

  const action = updatePatientAction.bind(null, patient.id);

  return (
    <div>
      <h1 className="text-xl font-semibold">Edit — {fullName(patient)}</h1>
      <div className="mt-6">
        <PatientForm
          action={action}
          submitLabel="Save changes"
          defaults={{
            firstName: patient.firstName,
            lastName: patient.lastName,
            dob: patient.dob?.toISOString().slice(0, 10),
            sex: patient.sex ?? "",
            cpr: patient.cpr ?? "",
            phone: patient.phone ?? "",
            email: patient.email ?? "",
            address: patient.address ?? "",
            referralSource: patient.referralSource ?? "",
            notes: patient.notes ?? "",
            whatsappOptIn: patient.whatsappOptIn,
          }}
        />
      </div>
    </div>
  );
}
