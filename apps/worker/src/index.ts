import { Worker } from "bullmq";
import { prisma } from "@dentalos/db";
import { processReminderScan } from "./jobs/reminders";
import { QUEUE_NAMES, createQueues, createRedisConnection } from "./queues";

async function main() {
  const connection = createRedisConnection();
  const queues = createQueues(connection);

  // repeatable scan: every 5 minutes
  await queues.reminders.upsertJobScheduler("reminder-scan", { every: 5 * 60 * 1000 });

  const workers = [
    new Worker(QUEUE_NAMES.reminders, processReminderScan, { connection }),
    // Phase 4: inbound-messages + campaigns workers register here
  ];

  for (const w of workers) {
    w.on("failed", (job, err) => {
      console.error(`[${w.name}] job ${job?.id} failed:`, err.message);
    });
  }

  console.log(`DentalOS worker running — queues: ${Object.values(QUEUE_NAMES).join(", ")}`);

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down…`);
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all(Object.values(queues).map((q) => q.close()));
    connection.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
