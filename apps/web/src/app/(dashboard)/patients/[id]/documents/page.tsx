import { notFound } from "next/navigation";
import { openDocumentAction } from "@/lib/actions/documents";
import { isStorageConfigured } from "@/lib/s3";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";
import { DocumentUploadForm } from "./upload-form";

const TYPE_LABELS: Record<string, string> = {
  XRAY: "X-ray",
  PHOTO: "Photo",
  LAB: "Lab",
  CONSENT: "Consent",
  INSURANCE_CARD: "Insurance card",
  OTHER: "Other",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PatientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!patient || patient.deletedAt) notFound();

  const storageReady = isStorageConfigured();

  return (
    <div>
      <h1 className="text-xl font-semibold">Documents — {fullName(patient)}</h1>

      {storageReady ? (
        <div className="mt-4">
          <DocumentUploadForm patientId={patient.id} />
        </div>
      ) : (
        <p className="mt-4 max-w-lg rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Object storage is not configured (set S3_* environment variables — MinIO from
          docker-compose works out of the box). Uploads are disabled until then.
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patient.documents.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{d.fileName}</td>
                <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[d.type] ?? d.type}</td>
                <td className="px-4 py-3 text-gray-600">{formatSize(d.sizeBytes)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {d.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  {storageReady && (
                    <form action={openDocumentAction.bind(null, d.id)}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Open
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {patient.documents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  No documents yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
