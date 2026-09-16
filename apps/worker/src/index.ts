import { prisma } from "@dentalos/db";
import { processWebhookEvents } from "./jobs/process-webhooks";
import { runReminderScan } from "./jobs/reminders";
import { runCampaigns } from "./jobs/campaigns";

/**
 * DentalOS worker — DB-backed job loops. The database is the queue:
 * WebhookEvent.processedAt, ReminderLog's unique constraint, and Campaign
 * status transitions give idempotency, so no broker is needed at clinic
 * scale. Intervals overlap-guard themselves.
 */

type JobFn = () => Promise<void>;

function loop(name: string, everyMs: number, fn: JobFn): NodeJS.Timeout {
  let running = false;
  return setInterval(() => {
    if (running) return;
    running = true;
    fn()
      .catch((err) => console.error(`[${name}]`, err instanceof Error ? err.message : err))
      .finally(() => {
        running = false;
      });
  }, everyMs);
}

const timers = [
  loop("webhooks", 2_000, processWebhookEvents),
  loop("reminders", 60_000, runReminderScan),
  loop("campaigns", 10_000, runCampaigns),
];

console.log("DentalOS worker running — jobs: webhooks (2s), reminders (60s), campaigns (10s)");

// run once at boot so nothing waits a full interval
void processWebhookEvents().catch(() => {});
void runReminderScan().catch(() => {});

const shutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down…`);
  for (const t of timers) clearInterval(t);
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
