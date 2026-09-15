import type { Job } from "bullmq";

/**
 * Phase 1/4: scan for appointments whose reminder window just opened
 * (startsAt - ReminderRule.offset), skip opted-out patients and already-sent
 * reminders (ReminderLog), then enqueue WhatsApp template sends.
 *
 * Phase 0 placeholder — proves the queue wiring end to end.
 */
export async function processReminderScan(job: Job): Promise<void> {
  console.log(`[reminders] scan tick (job ${job.id}) — no reminder rules yet (Phase 0)`);
}
