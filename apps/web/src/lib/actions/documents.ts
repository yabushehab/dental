"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrgContext } from "../org";
import { isStorageConfigured, presignedGetUrl, putObject } from "../s3";

export type DocumentFormState = { error?: string };

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const DOCUMENT_TYPES = ["XRAY", "PHOTO", "LAB", "CONSENT", "INSURANCE_CARD", "OTHER"] as const;

export async function uploadDocumentAction(
  patientId: string,
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const { db, organization, user } = await requireOrgContext();
  if (!isStorageConfigured()) return { error: "Object storage is not configured" };

  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.deletedAt) return { error: "Patient not found" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file" };
  if (file.size > MAX_BYTES) return { error: "File is larger than 15 MB" };

  const typeRaw = String(formData.get("type") ?? "OTHER");
  const type = (DOCUMENT_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as (typeof DOCUMENT_TYPES)[number])
    : "OTHER";

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
  const s3Key = `org/${organization.id}/patients/${patientId}/${Date.now()}-${safeName}`;

  await putObject(s3Key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");

  await db.document.create({
    data: {
      organizationId: organization.id,
      patientId,
      type,
      s3Key,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedByUserId: user.id,
    },
  });

  revalidatePath(`/patients/${patientId}/documents`);
  return {};
}

export async function openDocumentAction(documentId: string): Promise<void> {
  const { db } = await requireOrgContext();
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.deletedAt) return;
  const url = await presignedGetUrl(doc.s3Key, doc.fileName);
  redirect(url);
}
