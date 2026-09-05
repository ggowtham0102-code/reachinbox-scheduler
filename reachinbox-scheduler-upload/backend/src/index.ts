import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { env } from "./config/env";
import passport from "./config/passport";
import { authRouter } from "./routes/auth";
import { slackRouter } from "./routes/slack";
import { emailRouter } from "./routes/email";
import { ensureRedisServer } from "./redis/embeddedRedis";
import { ensureIndex } from "./services/elasticsearch";

async function start() {
  await ensureRedisServer();

  // Boot the worker in-process for local dev convenience.
  require("./queue/worker");
  const { emailQueue } = require("./queue/emailQueue");

  const app = express();

  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(
    cookieSession({
      name: "session",
      secret: env.sessionSecret,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/", (_req, res) => {
    res.json({
      name: "ReachInbox Email Scheduler API",
      status: "online",
      health: "/health",
      queues: "/admin/queues",
      frontend: env.frontendUrl,
    });
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/slack", slackRouter);
  app.use("/api/emails", emailRouter);

  // Live BullMQ dashboard at /admin/queues
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({
    queues: [new BullMQAdapter(emailQueue) as any],
    serverAdapter,
  });
  app.use("/admin/queues", serverAdapter.getRouter());

  ensureIndex().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[elasticsearch] failed to ensure index:", err);
  });

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`[server] Bull Board at http://localhost:${env.port}/admin/queues`);
  });
}

start().catch((err) => {
  console.error("[server] startup error:", err);
});

