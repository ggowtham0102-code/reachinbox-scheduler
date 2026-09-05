import { env } from "../config/env";

export function buildSlackAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.slack.clientId,
    scope: "incoming-webhook,chat:write",
    redirect_uri: env.slack.redirectUrl,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  team?: { id: string; name: string };
  incoming_webhook?: { url: string; channel: string };
}

/** Exchanges the OAuth `code` for a real incoming-webhook URL. */
export async function exchangeSlackCode(code: string): Promise<{
  webhookUrl: string;
  teamName: string;
}> {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.slack.clientId,
      client_secret: env.slack.clientSecret,
      code,
      redirect_uri: env.slack.redirectUrl,
    }),
  });

  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.incoming_webhook) {
    throw new Error(`Slack OAuth failed: ${data.error ?? "unknown error"}`);
  }

  return {
    webhookUrl: data.incoming_webhook.url,
    teamName: data.team?.name ?? "Slack workspace",
  };
}

/**
 * Posts a live message to the user's stored incoming webhook. If the user
 * never connected Slack (`webhookUrl` is null/undefined), this is a no-op —
 * rate-limit hits must never crash or block sending just because Slack isn't
 * connected. Reconnecting later works immediately since we always look the
 * webhook URL up fresh at call time (no cached client, no redeploy needed).
 */
export async function notifyRateLimitHit(
  webhookUrl: string | null | undefined,
  info: { senderEmail: string; limit: number; deferredCount: number; retryAt: Date }
): Promise<void> {
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:
          `:warning: *Hourly send limit reached* for \`${info.senderEmail}\`\n` +
          `Limit: ${info.limit}/hour · Deferred ${info.deferredCount} email(s) to ${info.retryAt.toISOString()}`,
      }),
    });
  } catch (err) {
    // Never let a Slack failure affect email delivery.
    // eslint-disable-next-line no-console
    console.error("[slack] failed to post rate-limit notification:", err);
  }
}
