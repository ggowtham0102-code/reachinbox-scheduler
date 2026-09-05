import { redis } from "../redis/client";
import { env } from "../config/env";

/**
 * Atomically increments the per-sender, per-hour-window counter and returns
 * the new count. Uses a Lua script so the INCR + EXPIRE pair is a single
 * atomic operation — safe across many concurrent worker processes hitting
 * the same key at once (no read-modify-write race).
 */
const INCR_AND_EXPIRE_LUA = `
local current = redis.call("INCR", KEYS[1])
if tonumber(current) == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
end
return current
`;

/** Truncates a Date down to the start of its hour, e.g. 2026-09-05T14:37 -> 2026-09-05T14:00:00.000Z */
export function hourBucketStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export function nextHourBoundary(date: Date): Date {
  const start = hourBucketStart(date);
  return new Date(start.getTime() + 60 * 60 * 1000);
}

function rateLimitKey(senderEmail: string, hourStart: Date): string {
  return `ratelimit:${senderEmail}:${hourStart.toISOString()}`;
}

export interface RateLimitCheck {
  allowed: boolean;
  count: number;
  limit: number;
  retryAt: Date;
}

/**
 * Reserves one send slot for `senderEmail` in the current hour window.
 * Always increments (so retries don't get a free pass) — callers that get
 * `allowed: false` are expected to defer the job rather than send.
 */
export async function reserveSendSlot(
  senderEmail: string,
  now: Date = new Date(),
  limit: number = env.maxEmailsPerHourPerSender
): Promise<RateLimitCheck> {
  const hourStart = hourBucketStart(now);
  const key = rateLimitKey(senderEmail, hourStart);
  // TTL a little longer than an hour so the key definitely outlives the window.
  const ttlSeconds = 60 * 65;

  const count = (await redis.eval(
    INCR_AND_EXPIRE_LUA,
    1,
    key,
    ttlSeconds
  )) as number;

  return {
    allowed: count <= limit,
    count,
    limit,
    retryAt: nextHourBoundary(now),
  };
}
