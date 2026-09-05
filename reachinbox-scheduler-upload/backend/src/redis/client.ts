import IORedis, { Redis } from "ioredis";
import { env } from "../config/env";

// BullMQ requires maxRetriesPerRequest: null on the connection it's given.
export function createRedisConnection(): Redis {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
  });
}

// A shared connection for our own rate-limiter reads/writes (separate from
// whatever connection(s) BullMQ opens internally for the queue/worker).
export const redis = createRedisConnection();
