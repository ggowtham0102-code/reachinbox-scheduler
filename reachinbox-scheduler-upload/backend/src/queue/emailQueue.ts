import { Queue } from "bullmq";
import { createRedisConnection } from "../redis/client";
import { EMAIL_QUEUE_NAME } from "../config/env";

export interface EmailJobData {
  emailJobId: string; // Postgres EmailJob.id — also used as the BullMQ jobId (idempotency key)
  toEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24 * 7 }, // keep 7 days of history for Bull Board
    removeOnFail: { age: 60 * 60 * 24 * 30 },
  },
});

/**
 * Schedules a single recipient email. `jobId = emailJobId` means calling this
 * twice for the same Postgres row is a safe no-op (BullMQ dedupes by jobId) —
 * this is the first of two idempotency layers (see worker.ts for the second,
 * DB-status based one).
 */
export async function enqueueEmailJob(
  data: EmailJobData,
  scheduledAt: Date
) {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  return emailQueue.add(EMAIL_QUEUE_NAME, data, {
    jobId: data.emailJobId,
    delay,
  });
}
