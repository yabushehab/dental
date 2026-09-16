"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { orgScoped, prisma } from "@dentalos/db";
import { parseAmount, vatOn } from "@dentalos/shared";
import { requirePermission } from "../rbac";
import { nextCounterValue } from "../org";
import { orgCurrency } from "../currency";

export type BillingFormState = { error?: string };

async function billingCtx(permission: "billing:write" | "payments:take" = "billing:write") {
  const { organization, user } = await requirePermission(permission);
  return { db: orgScoped(prisma, organization.id), organization, user };
}

function paymentStatus(totalFils: number, paidFils: number): "ISSUED" | "PARTIALLY_PAID" | "PAID" {
  if (paidFils <= 0) return "ISSUED";
  return paidFils >= totalFils ? "PAID" : "PARTIALLY_PAID";
}

// --- Invoices -----------------------------------------------------------------

export async function createInvoiceAction(
  patientId: string,
  _prev: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const { db, organization, user } = await billingCtx();
  const currency = orgCurrency(organization);

  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.deletedAt) return { error: "Patient not found" };
  const clinic = await db.clinic.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!clinic) return { error: "No active branch" };

  // billed treatment plan items
  const itemIds = formData.getAll("itemId").map(String);
  const items = itemIds.length
    ? await db.treatmentPlanItem.findMany({
        where: {
          id: { in: itemIds },
          status: "COMPLETED",
          invoiceLines: { none: {} },
          plan: { patientId },
        },
        include: { procedureCode: true },
      })
    : [];

  // custom lines
  const descs = formData.getAll("lineDesc").map(String);
  const prices = formData.getAll("linePrice").map(String);
  const qtys = formData.getAll("lineQty").map(String);
  const vats = formData.getAll("lineVat").map(String);
  const custom: Array<{ description: string; unitPriceFils: number; qty: number; vatRate: number }> = [];
  for (let i = 0; i < descs.length; i++) {
    const description = (descs[i] ?? "").trim();
    if (!description) continue;
    let unitPriceFils: number;
    try {
      unitPriceFils = parseAmount((prices[i] ?? "0").trim() || "0", currency);
    } catch {
      return { error: `Invalid price on line "${description}"` };
    }
    const qty = Math.max(1, Math.min(99, Number(qtys[i] ?? 1) || 1));
    const vatRate = Math.max(0, Math.min(100, Number(vats[i] ?? 0) || 0));
    custom.push({ description, unitPriceFils, qty, vatRate });
  }

  if (items.length === 0 && custom.length === 0) {
    return { error: "Select completed treatments or add at least one line" };
  }

  const lines = [
    ...items.map((it) => {
      const net = it.priceFils;
      const vat = vatOn(net, Number(it.vatRate));
      return {
        organizationId: organization.id,
        treatmentPlanItemId: it.id,
        procedureCodeId: it.procedureCodeId,
        description: it.procedureCode.name,
        toothFdi: it.toothFdi,
        qty: 1,
        unitPriceFils: it.priceFils,
        vatRate: it.vatRate,
        vatFils: vat,
        totalFils: net + vat,
      };
    }),
    ...custom.map((c) => {
      const net = c.unitPriceFils * c.qty;
      const vat = vatOn(net, c.vatRate);
      return {
        organizationId: organization.id,
        treatmentPlanItemId: null,
        procedureCodeId: null,
        description: c.description,
        toothFdi: null,
        qty: c.qty,
        unitPriceFils: c.unitPriceFils,
        vatRate: c.vatRate,
        vatFils: vat,
        totalFils: net + vat,
      };
    }),
  ];
  const subtotalFils = lines.reduce((s, l) => s + l.unitPriceFils * l.qty, 0);
  const vatFils = lines.reduce((s, l) => s + l.vatFils, 0);

  const invoice = await db.invoice.create({
    data: {
      organizationId: organization.id,
      clinicId: clinic.id,
      patientId,
      subtotalFils,
      vatFils,
      totalFils: subtotalFils + vatFils,
      createdByUserId: user.id,
      lines: { create: lines.map(({ organizationId, ...rest }) => ({ organizationId, ...rest })) },
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "invoice.created",
      entityType: "Invoice",
      entityId: invoice.id,
      after: { totalFils: subtotalFils + vatFils, lines: lines.length },
    },
  });

  redirect(`/billing/invoices/${invoice.id}`);
}

export async function issueInvoiceAction(invoiceId: string): Promise<void> {
  const { db, organization, user } = await billingCtx();
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status !== "DRAFT") return;

  const year = new Date().getUTCFullYear();
  const seq = await nextCounterValue(db, organization.id, `invoice-${year}`, 1);
  const number = `INV-${year}-${String(seq).padStart(5, "0")}`;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      number,
      status: "ISSUED",
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "invoice.issued",
      entityType: "Invoice",
      entityId: invoiceId,
      after: { number },
    },
  });
  revalidatePath(`/billing/invoices/${invoiceId}`);
}

export async function voidInvoiceAction(invoiceId: string): Promise<void> {
  const { db, organization, user } = await billingCtx();
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "VOID" || invoice.paidFils > 0) return;

  await db.invoice.update({ where: { id: invoiceId }, data: { status: "VOID" } });
  await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "invoice.voided",
      entityType: "Invoice",
      entityId: invoiceId,
      before: { status: invoice.status },
    },
  });
  revalidatePath(`/billing/invoices/${invoiceId}`);
}

// --- Payments -------------------------------------------------------------------

export async function recordPaymentAction(
  _prev: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const { db, organization, user } = await billingCtx("payments:take");
  const currency = orgCurrency(organization);

  const parsed = z
    .object({
      patientId: z.string().min(1),
      invoiceId: z.string().optional(),
      amount: z.string().trim().min(1, "Amount is required"),
      method: z.enum(["CASH", "CARD", "BENEFIT", "BANK_TRANSFER", "INSURANCE"]),
      reference: z.string().trim().max(120).optional(),
    })
    .safeParse({
      patientId: formData.get("patientId"),
      invoiceId: String(formData.get("invoiceId") ?? "") || undefined,
      amount: formData.get("amount"),
      method: formData.get("method"),
      reference: String(formData.get("reference") ?? "") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  let amountFils: number;
  try {
    amountFils = parseAmount(input.amount, currency);
  } catch {
    return { error: `Invalid amount — use ${currency.code} format like 25.000` };
  }
  if (amountFils <= 0) return { error: "Amount must be positive" };

  let invoice = null;
  if (input.invoiceId) {
    invoice = await db.invoice.findUnique({ where: { id: input.invoiceId } });
    if (!invoice) return { error: "Invoice not found" };
    if (["DRAFT", "VOID"].includes(invoice.status)) {
      return { error: "Issue the invoice before taking payment" };
    }
  }
  const clinic = invoice
    ? { id: invoice.clinicId }
    : await db.clinic.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!clinic) return { error: "No active branch" };

  const year = new Date().getUTCFullYear();
  const seq = await nextCounterValue(db, organization.id, `receipt-${year}`, 1);
  const receiptNumber = `RCP-${year}-${String(seq).padStart(5, "0")}`;

  await db.payment.create({
    data: {
      organizationId: organization.id,
      clinicId: clinic.id,
      patientId: input.patientId,
      invoiceId: invoice?.id ?? null,
      amountFils,
      method: input.method,
      reference: input.reference ?? null,
      receiptNumber,
      receivedByUserId: user.id,
    },
  });

  if (invoice) {
    const paidFils = invoice.paidFils + amountFils;
    await db.invoice.update({
      where: { id: invoice.id },
      data: { paidFils, status: paymentStatus(invoice.totalFils, paidFils) },
    });
    revalidatePath(`/billing/invoices/${invoice.id}`);
  }
  revalidatePath(`/patients/${input.patientId}/billing`);
  return {};
}

// --- Insurance -------------------------------------------------------------------

export async function setInsurancePortionAction(
  invoiceId: string,
  formData: FormData,
): Promise<void> {
  const { db, organization } = await billingCtx();
  const currency = orgCurrency(organization);
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "VOID") return;

  const raw = String(formData.get("portion") ?? "").trim();
  let portion: number;
  try {
    portion = raw.endsWith("%")
      ? Math.round((invoice.totalFils * Number(raw.slice(0, -1))) / 100)
      : parseAmount(raw, currency);
  } catch {
    return;
  }
  portion = Math.max(0, Math.min(invoice.totalFils, portion));
  await db.invoice.update({ where: { id: invoiceId }, data: { insurancePortionFils: portion } });
  revalidatePath(`/billing/invoices/${invoiceId}`);
}

export async function createClaimAction(
  invoiceId: string,
  _prev: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const { db, organization } = await billingCtx();
  const currency = orgCurrency(organization);

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: "Invoice not found" };

  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) return { error: "Pick a policy" };
  const policy = await db.insurancePolicy.findUnique({ where: { id: policyId } });
  if (!policy || policy.patientId !== invoice.patientId) return { error: "Policy not found" };

  const raw = String(formData.get("claimed") ?? "").trim();
  let claimedFils = invoice.insurancePortionFils || invoice.totalFils;
  if (raw) {
    try {
      claimedFils = parseAmount(raw, currency);
    } catch {
      return { error: "Invalid claim amount" };
    }
  }

  await db.insuranceClaim.create({
    data: { organizationId: organization.id, invoiceId, policyId, claimedFils },
  });
  revalidatePath(`/billing/invoices/${invoiceId}`);
  return {};
}

export async function updateClaimStatusAction(
  claimId: string,
  status: string,
  formData?: FormData,
): Promise<void> {
  const { db, organization, user } = await billingCtx();
  const claim = await db.insuranceClaim.findUnique({
    where: { id: claimId },
    include: { invoice: true },
  });
  if (!claim) return;

  const allowed: Record<string, string[]> = {
    PREPARING: ["SUBMITTED"],
    SUBMITTED: ["APPROVED", "PARTIALLY_APPROVED", "REJECTED"],
    APPROVED: ["PAID"],
    PARTIALLY_APPROVED: ["PAID"],
    REJECTED: [],
    PAID: [],
  };
  if (!allowed[claim.status]?.includes(status)) return;

  const currency = orgCurrency(organization);
  let approvedFils = claim.approvedFils;
  if (status === "APPROVED") approvedFils = claim.claimedFils;
  if (status === "PARTIALLY_APPROVED") {
    const raw = String(formData?.get("approved") ?? "").trim();
    try {
      approvedFils = raw ? parseAmount(raw, currency) : claim.claimedFils;
    } catch {
      return;
    }
  }
  const rejectionReason =
    status === "REJECTED" ? String(formData?.get("reason") ?? "").trim() || null : claim.rejectionReason;

  await db.insuranceClaim.update({
    where: { id: claimId },
    data: {
      status: status as never,
      approvedFils,
      rejectionReason,
      ...(status === "SUBMITTED" ? { submittedAt: new Date() } : {}),
      ...(["APPROVED", "PARTIALLY_APPROVED", "REJECTED"].includes(status)
        ? { resolvedAt: new Date() }
        : {}),
    },
  });

  // marking PAID records the insurer's payment against the invoice
  if (status === "PAID" && approvedFils && approvedFils > 0) {
    const year = new Date().getUTCFullYear();
    const seq = await nextCounterValue(db, organization.id, `receipt-${year}`, 1);
    await db.payment.create({
      data: {
        organizationId: organization.id,
        clinicId: claim.invoice.clinicId,
        patientId: claim.invoice.patientId,
        invoiceId: claim.invoiceId,
        amountFils: approvedFils,
        method: "INSURANCE",
        reference: `Claim ${claimId.slice(-6)}`,
        receiptNumber: `RCP-${year}-${String(seq).padStart(5, "0")}`,
        receivedByUserId: user.id,
      },
    });
    const paidFils = claim.invoice.paidFils + approvedFils;
    await db.invoice.update({
      where: { id: claim.invoiceId },
      data: { paidFils, status: paymentStatus(claim.invoice.totalFils, paidFils) },
    });
  }
  revalidatePath(`/billing/invoices/${claim.invoiceId}`);
}

// --- Insurance companies & policies ------------------------------------------------

export async function createInsuranceCompanyAction(formData: FormData): Promise<void> {
  const { organization } = await requirePermission("settings:manage");
  const db = orgScoped(prisma, organization.id);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insuranceCompany.create({
    data: {
      organizationId: organization.id,
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
    },
  });
  revalidatePath("/settings/insurance");
}

export async function createPolicyAction(
  patientId: string,
  _prev: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const { db, organization } = await billingCtx();
  const currency = orgCurrency(organization);

  const companyId = String(formData.get("companyId") ?? "");
  const policyNumber = String(formData.get("policyNumber") ?? "").trim();
  if (!companyId || !policyNumber) return { error: "Company and policy number are required" };

  const coveragePercent = Math.max(0, Math.min(100, Number(formData.get("coveragePercent") ?? 0) || 0));
  const limitRaw = String(formData.get("annualLimit") ?? "").trim();
  let annualLimitFils: number | null = null;
  if (limitRaw) {
    try {
      annualLimitFils = parseAmount(limitRaw, currency);
    } catch {
      return { error: "Invalid annual limit" };
    }
  }

  await db.insurancePolicy.create({
    data: {
      organizationId: organization.id,
      patientId,
      companyId,
      policyNumber,
      memberId: String(formData.get("memberId") ?? "").trim() || null,
      coveragePercent,
      annualLimitFils,
    },
  });
  revalidatePath(`/patients/${patientId}/billing`);
  return {};
}
