import { NextResponse } from "next/server";
import { prisma } from "@dentalos/db";

export const dynamic = "force-dynamic";

/**
 * Platform health probe. Returns 200 only when the database is reachable,
 * so a rolling deploy with a broken DATABASE_URL fails the health check
 * instead of serving errors to the clinic.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "up",
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        database: "down",
        error: err instanceof Error ? err.message : "unknown error",
      },
      { status: 503 },
    );
  }
}
