import { PatientForm } from "@/components/patient-form";
import { createPatientAction } from "@/lib/actions/patients";

export default function NewPatientPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">New patient</h1>
      <div className="mt-6">
        <PatientForm action={createPatientAction} submitLabel="Create patient" />
      </div>
    </div>
  );
}
