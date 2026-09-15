import { NextResponse, type NextRequest } from "next/server";
import { orgScoped, prisma } from "@dentalos/db";
import { getCurrentUser } from "@/lib/current-user";

/** Patient picker autocomplete for the appointment modal. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.organization) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ patients: [] });

  const db = orgScoped(prisma, user.organization.id);
  const numeric = /^\d+$/.test(q) ? Number(q) : null;
  const patients = await db.patient.findMany({
    where: {
      deletedAt: null,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        ...(numeric !== null ? [{ fileNumber: numeric }] : []),
      ],
    },
    orderBy: [{ lastName: "asc" }],
    take: 10,
    select: { id: true, firstName: true, lastName: true, fileNumber: true, phone: true },
  });

  return NextResponse.json({
    patients: patients.map((p) => ({
      id: p.id,
      label: `${p.firstName} ${p.lastName} · #${p.fileNumber}${p.phone ? ` · ${p.phone}` : ""}`,
    })),
  });
}
