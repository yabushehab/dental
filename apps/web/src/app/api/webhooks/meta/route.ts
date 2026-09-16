import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@dentalos/db";
import { verifyMetaSignature } from "@dentalos/meta";

/**
 * Meta webhook endpoint (WhatsApp / Instagram / Messenger).
 * Verifies, stores the raw event, returns 200 fast — all processing
 * happens in the worker.
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (
    params.get("hub.mode") === "subscribe" &&
    verifyToken &&
    params.get("hub.verify_token") === verifyToken
  ) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(appSecret, rawBody, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const platform = String((payload as { object?: string })?.object ?? "unknown");
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");

  // idempotent on the body hash — Meta redelivers on timeouts
  await prisma.webhookEvent.upsert({
    where: { externalEventId: bodyHash },
    update: {},
    create: { platform, externalEventId: bodyHash, payload: payload as never },
  });

  return NextResponse.json({ received: true });
}
