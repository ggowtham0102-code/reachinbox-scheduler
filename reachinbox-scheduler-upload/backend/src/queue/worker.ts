import "dotenv/config";
import { Job, Worker } from "bullmq";
import { createRedisConnection } from "../redis/client";
import { EMAIL_QUEUE_NAME, env } from "../config/env";
import { prisma } from "../db/prisma";
import { sendEmail } from "../services/mailer";
import { indexEmailJob } from "../services/elasticsearch";
import { notifyRateLimitHit } from "../services/slack";
import { reserveSendSlot } from "./rateLimiter";
import type { EmailJobData } from "./emailQueue";

async function handleEmailJob(
  job: Job<EmailJobData>,
  token?: string
): Promise<void> {
  const { emailJobId, toEmail, subject, body, senderEmail } = job.data;

  // --- Idempotency layer 2: re-check DB status before doing any work. ---
  // If a previous attempt already marked this SENT (e.g. the process crashed
  // right after sending but before BullMQ recorded completion, and the job
  // got retried/stalled), skip silently instead of double-sending.
  const record = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
  if (!record) {
    // Row was deleted / never existed — nothing to do.
    return;
  }
  if (record.status === "SENT") {
    return;
  }

  // --- Per-sender hourly rate limit (Redis-backed, atomic, multi-worker safe) ---
  const rate = await reserveSendSlot(senderEmail);
  if (!rate.allowed) {
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "DEFERRED", scheduledAt: rate.retryAt },
    });

    // Re-enqueue for the start of the next hour window instead of failing.
    // moveToDelayed requires the processor's lock token — this keeps the
    // same jobId, so it's still idempotent (no duplicate job is created).
    if (token) {
      await job.moveToDelayed(rate.retryAt.getTime(), token);
    } else {
      // Fallback path (shouldn't normally happen): throw so BullMQ retries
      // with backoff; the DB status above still prevents a double send.
      throw new Error("rate-limited-retry");
    }

    const user = await prisma.emailBatch
      .findFirst({ where: { senderEmail }, include: { user: true } })
      .then((b: { user: { slackWebhookUrl: string | null } } | null) => b?.user);
    await notifyRateLimitHit(user?.slackWebhookUrl, {
      senderEmail,
      limit: rate.limit,
      deferredCount: 1,
      retryAt: rate.retryAt,
    });
    return;
  }

  // --- Send via Ethereal ---
  try {
    const result = await sendEmail({
      from: senderEmail,
      to: toEmail,
      subject,
      html: body,
    });

    const updated = await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        previewUrl: result.previewUrl,
        attempts: { increment: 1 },
      },
    });

    await indexEmailJob({
      id: updated.id,
      subject: updated.subject,
      body: updated.body,
      toEmail: updated.toEmail,
      senderEmail: updated.senderEmail,
      status: updated.status,
      sentAt: updated.sentAt,
      scheduledAt: updated.scheduledAt,
    });
  } catch (err) {
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : String(err),
        attempts: { increment: 1 },
      },
    });
    throw err; // let BullMQ's retry/backoff policy handle re-attempts
  }
}

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  handleEmailJob,
  {
    connection: createRedisConnection(),
    concurrency: env.workerConcurrency,
    // Global minimum pacing between sends this worker processes (see README §2.3
    // for why this is global rather than per-sender in the open-source version).
    limiter: {
      max: 1,
      duration: env.minSendDelayMs,
    },
  }
);

emailWorker.on("completed", (job) => {
  // eslint-disable-next-line no-console
  console.log(`[worker] sent job ${job.id} -> ${job.data.toEmail}`);
});

emailWorker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

// eslint-disable-next-line no-console
console.log(
  `[worker] listening on queue "${EMAIL_QUEUE_NAME}" with concurrency=${env.workerConcurrency}`
);
