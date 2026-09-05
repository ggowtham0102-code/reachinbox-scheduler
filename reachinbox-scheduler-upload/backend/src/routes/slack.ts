import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/requireAuth";
import { buildSlackAuthorizeUrl, exchangeSlackCode } from "../services/slack";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

export const slackRouter = Router();

// In-memory state store for CSRF protection during the OAuth handshake.
// Good enough for a single-instance dev/demo deployment; swap for Redis if
// you run multiple API instances behind a load balancer.
const pendingStates = new Map<string, string>(); // state -> userId

slackRouter.get("/oauth/start", requireAuth, (req, res) => {
  const state = randomUUID();
  pendingStates.set(state, (req.user as { id: string }).id);
  res.redirect(buildSlackAuthorizeUrl(state));
});

slackRouter.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const userId = state ? pendingStates.get(state) : undefined;

  if (!code || !userId) {
    return res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }
  pendingStates.delete(state!);

  try {
    const { webhookUrl, teamName } = await exchangeSlackCode(code);
    await prisma.user.update({
      where: { id: userId },
      data: { slackWebhookUrl: webhookUrl, slackTeamName: teamName },
    });
    res.redirect(`${env.frontendUrl}/dashboard?slack=connected`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[slack] oauth callback failed:", err);
    res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }
});

slackRouter.post("/disconnect", requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  await prisma.user.update({
    where: { id: userId },
    data: { slackWebhookUrl: null, slackTeamName: null },
  });
  res.json({ ok: true });
});

slackRouter.get("/status", requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  res.json({
    connected: Boolean(user?.slackWebhookUrl),
    teamName: user?.slackTeamName ?? null,
  });
});
