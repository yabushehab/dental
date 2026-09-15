"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { orgScoped, prisma } from "@dentalos/db";
import { parseAmount } from "@dentalos/shared";
import { requirePermission } from "../rbac";

async function ctx() {
  const { organization } = await requirePermission("settings:manage");
  return { db: orgScoped(prisma, organization.id), organization };
}

const CATEGORIES = [
  "DIAGNOSTIC", "PREVENTIVE", "RESTORATIVE", "ENDO", "PERIO",
  "PROSTHO", "ORTHO", "SURGERY", "IMPLANT", "COSMETIC",
] as const;

export async function createProcedureCodeAction(formData: FormData): Promise<void> {
  const { db, organization } = await ctx();
  const parsed = z
    .object({
      code: z.string().trim().min(1).max(20),
      name: z.string().trim().min(2).max(160),
      category: z.enum(CATEGORIES),
      price: z.string().trim().default(""),
      vatRate: z.coerce.number().min(0).max(100).default(0),
    })
    .safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      category: formData.get("category"),
      price: formData.get("price") ?? "",
      vatRate: formData.get("vatRate") ?? "0",
    });
  if (!parsed.success) return;

  let priceFils = 0;
  if (parsed.data.price) {
    try {
      priceFils = parseAmount(parsed.data.price, {
        code: organization.currency,
        exponent: organization.currencyExponent,
      });
    } catch {
      return;
    }
  }

  const exists = await db.procedureCode.findFirst({ where: { code: parsed.data.code } });
  if (exists) return;

  await db.procedureCode.create({
    data: {
      organizationId: organization.id,
      code: parsed.data.code,
      name: parsed.data.name,
      category: parsed.data.category,
      defaultPriceFils: priceFils,
      vatRate: parsed.data.vatRate,
    },
  });
  revalidatePath("/settings/procedures");
}

export async function updateProcedurePriceAction(codeId: string, formData: FormData): Promise<void> {
  const { db, organization } = await ctx();
  const code = await db.procedureCode.findUnique({ where: { id: codeId } });
  if (!code) return;

  const priceRaw = String(formData.get("price") ?? "").trim();
  const vatRaw = Number(formData.get("vatRate") ?? Number(code.vatRate));
  let priceFils = code.defaultPriceFils;
  if (priceRaw) {
    try {
      priceFils = parseAmount(priceRaw, {
        code: organization.currency,
        exponent: organization.currencyExponent,
      });
    } catch {
      return;
    }
  }
  const vatRate = Number.isFinite(vatRaw) ? Math.min(Math.max(vatRaw, 0), 100) : Number(code.vatRate);

  await db.procedureCode.update({
    where: { id: codeId },
    data: { defaultPriceFils: priceFils, vatRate },
  });
  revalidatePath("/settings/procedures");
}

export async function toggleProcedureCodeAction(codeId: string): Promise<void> {
  const { db } = await ctx();
  const code = await db.procedureCode.findUnique({ where: { id: codeId } });
  if (!code) return;
  await db.procedureCode.update({ where: { id: codeId }, data: { isActive: !code.isActive } });
  revalidatePath("/settings/procedures");
}
