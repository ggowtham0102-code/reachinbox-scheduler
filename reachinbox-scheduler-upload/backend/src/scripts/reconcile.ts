import "dotenv/config";
import { prisma } from "../db/prisma";
import { emailQueue, enqueueEmailJob } from "../queue/emailQueue";

/**
 * Defensive reconciliation: finds every Postgres EmailJob still marked
 * SCHEDULED/DEFERRED and makes sure a matching BullMQ job exists, re-adding
 * it if not. Safe to run any time (adding with the same jobId is a no-op),
 * and is the recovery path if Redis itself is ever wiped or swapped —
 * Postgres remains the durable source of truth for "what still needs to send".
 *
 * Run with: npm run reconcile
 */
async function main() {
  const pending = await prisma.emailJob.findMany({
    where: { status: { in: ["SCHEDULED", "DEFERRED"] } },
  });

  let reAdded = 0;
  for (const job of pending) {
    const existing = await emailQueue.getJob(job.id);
    if (existing) continue;

    await enqueueEmailJob(
      {
        emailJobId: job.id,
        toEmail: job.toEmail,
        subject: job.subject,
        body: job.body,
        senderEmail: job.senderEmail,
      },
      job.scheduledAt
    );
    reAdded += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[reconcile] checked ${pending.length} pending job(s), re-added ${reAdded} missing from the queue.`
  );
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[reconcile] failed:", err);
  process.exit(1);
});
