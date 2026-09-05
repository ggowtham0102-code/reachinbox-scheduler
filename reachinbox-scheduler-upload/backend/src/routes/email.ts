import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../db/prisma";
import { enqueueEmailJob } from "../queue/emailQueue";
import { searchEmails } from "../services/elasticsearch";

export const emailRouter = Router();

const scheduleSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  senderEmail: z.string().email(),
  recipients: z.array(z.string().email()).min(1).max(10000),
  startTime: z.string().datetime(), // ISO string
  delayMs: z.number().int().min(0).default(2000),
  hourlyLimit: z.number().int().min(1).max(100000).optional(),
});

/**
 * Schedules one email per recipient. Recipient N is scheduled at
 * `startTime + N * delayMs`, giving a deterministic, evenly-spaced send
 * order even before the hourly rate limiter kicks in.
 */
emailRouter.post("/schedule", requireAuth, async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { subject, body, senderEmail, recipients, startTime, delayMs, hourlyLimit } =
    parsed.data;
  const userId = (req.user as { id: string }).id;
  const start = new Date(startTime);

  const batch = await prisma.emailBatch.create({
    data: {
      userId,
      subject,
      body,
      senderEmail,
      startTime: start,
      delayMs,
      hourlyLimit: hourlyLimit ?? 200,
    },
  });

  const jobs = await Promise.all(
    recipients.map(async (toEmail, index) => {
      const scheduledAt = new Date(start.getTime() + index * delayMs);
      const emailJob = await prisma.emailJob.create({
        data: {
          batchId: batch.id,
          toEmail,
          subject,
          body,
          senderEmail,
          scheduledAt,
        },
      });
      await enqueueEmailJob(
        {
          emailJobId: emailJob.id,
          toEmail,
          subject,
          body,
          senderEmail,
        },
        scheduledAt
      );
      return emailJob;
    })
  );

  res.status(201).json({ batchId: batch.id, scheduledCount: jobs.length });
});

emailRouter.get("/scheduled", requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const jobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ["SCHEDULED", "DEFERRED"] },
      batch: { userId },
    },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });
  res.json({ jobs });
});

emailRouter.get("/sent", requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const jobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ["SENT", "FAILED"] },
      batch: { userId },
    },
    orderBy: { sentAt: "desc" },
    take: 500,
  });
  res.json({ jobs });
});

emailRouter.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ results: [] });
  const results = await searchEmails(q);
  res.json({ results });
});
