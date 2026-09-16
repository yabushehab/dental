import { notFound } from "next/navigation";
import { formatAmount } from "@dentalos/shared";
import { requireOrgContext } from "@/lib/org";
import { orgCurrency } from "@/lib/currency";
import { fullName } from "@/lib/format";
import { NewInvoiceForm } from "./new-invoice-form";

export default async function NewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { db, organization } = await requireOrgContext();
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) notFound();
  const currency = orgCurrency(organization);

  // completed treatment plan items not yet billed
  const items = await db.treatmentPlanItem.findMany({
    where: { status: "COMPLETED", invoiceLines: { none: {} }, plan: { patientId: id } },
    include: { procedureCode: true, plan: true },
    orderBy: { completedAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">New invoice — {fullName(patient)}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Select completed treatments to bill, or add custom lines. The invoice is created as a
        draft — review it before issuing.
      </p>
      <div className="mt-5 max-w-3xl">
        <NewInvoiceForm
          patientId={patient.id}
          items={items.map((it) => ({
            id: it.id,
            label: `${it.procedureCode.code} · ${it.procedureCode.name}${it.toothFdi ? ` (tooth ${it.toothFdi})` : ""} — ${it.plan.title}`,
            price: formatAmount(it.priceFils, currency),
            vatRate: Number(it.vatRate),
          }))}
        />
      </div>
    </div>
  );
}
