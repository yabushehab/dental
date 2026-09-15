import { notFound } from "next/navigation";
import { can, type Role } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { fullName } from "@/lib/format";
import { signNoteAction } from "@/lib/actions/clinical";
import { NewNoteForm, AmendmentForm } from "./note-forms";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { db, membership } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) notFound();

  const [notes, providers, signerUsers] = await Promise.all([
    db.clinicalNote.findMany({
      where: { patientId: id },
      include: {
        provider: { include: { membership: { include: { user: true } } } },
        amendments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.provider.findMany({ include: { membership: { include: { user: true } } } }),
    Promise.resolve(null),
  ]);
  void signerUsers;

  const role = membership.role as Role;
  const canWrite = can(role, "clinical:write");
  const canSign = can(role, "clinical:sign");

  const SECTIONS = ["subjective", "objective", "assessment", "plan"] as const;
  const SECTION_LABELS = { subjective: "S", objective: "O", assessment: "A", plan: "P" };

  return (
    <div>
      <h1 className="text-xl font-semibold">Clinical notes — {fullName(patient)}</h1>

      {canWrite && (
        <div className="mt-4 max-w-2xl rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-800">New SOAP note</div>
          <NewNoteForm
            patientId={patient.id}
            providers={providers.map((p) => ({ id: p.id, name: p.membership.user.name }))}
          />
        </div>
      )}

      <div className="mt-6 space-y-4">
        {notes.map((n) => (
          <div key={n.id} className="max-w-2xl rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="text-sm">
                <span className="font-semibold">{n.provider.membership.user.name}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {n.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </div>
              {n.signedAt ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  ✓ Signed {n.signedAt.toISOString().slice(0, 10)}
                </span>
              ) : canSign ? (
                <form action={signNoteAction.bind(null, n.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    Sign note
                  </button>
                </form>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Unsigned
                </span>
              )}
            </div>
            <dl className="space-y-2 px-4 py-3 text-sm">
              {SECTIONS.filter((s) => n[s]).map((s) => (
                <div key={s} className="flex gap-3">
                  <dt className="w-5 shrink-0 font-bold text-brand-600">{SECTION_LABELS[s]}</dt>
                  <dd className="whitespace-pre-wrap text-gray-800">{n[s]}</dd>
                </div>
              ))}
            </dl>
            {n.amendments.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Amendments
                </div>
                <ul className="mt-1 space-y-1 text-sm text-gray-700">
                  {n.amendments.map((a) => (
                    <li key={a.id}>
                      <span className="font-mono text-xs text-gray-400">
                        {a.createdAt.toISOString().slice(0, 10)}
                      </span>{" "}
                      {a.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {n.signedAt && canWrite && (
              <div className="border-t border-gray-100 px-4 py-3">
                <AmendmentForm noteId={n.id} />
              </div>
            )}
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-gray-400">No clinical notes yet.</p>
        )}
      </div>
    </div>
  );
}
