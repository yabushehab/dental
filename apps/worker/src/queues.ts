import { Queue } from "bullmq";
import IORedis from "ioredis";

export const QUEUE_NAMES = {
  /** process raw Meta webhook events into Conversations/Messages (Phase 4) */
  inboundMessages: "inbound-messages",
  /** send due appointment reminders (Phase 1/4) */
  reminders: "reminders",
  /** campaign broadcast sends, throttled per WhatsApp tier (Phase 4) */
  campaigns: "campaigns",
} as const;

export function createRedisConnection(): IORedis {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    // BullMQ requirement: it manages retries itself
    maxRetriesPerRequest: null,
  });
}

export function createQueues(connection: IORedis) {
  return {
    inboundMessages: new Queue(QUEUE_NAMES.inboundMessages, { connection }),
    reminders: new Queue(QUEUE_NAMES.reminders, { connection }),
    campaigns: new Queue(QUEUE_NAMES.campaigns, { connection }),
  };
}
