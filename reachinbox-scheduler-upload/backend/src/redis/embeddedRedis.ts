import net from "net";
import { RedisMemoryServer } from "redis-memory-server";
import { env } from "../config/env";

let redisMemoryServer: RedisMemoryServer | null = null;

export async function ensureRedisServer(): Promise<void> {
  let port = 6379;
  let host = "127.0.0.1";

  try {
    const url = new URL(env.redisUrl);
    if (url.port) port = parseInt(url.port, 10);
    if (url.hostname) host = url.hostname;
  } catch (err) {
    // fallback to defaults if URL parsing fails
  }

  const isUp = await new Promise<boolean>((resolve) => {
    const socket = net.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });

  if (!isUp) {
    console.log(`[redis] Local Redis on ${host}:${port} not reachable. Booting in-memory Redis...`);
    redisMemoryServer = new RedisMemoryServer({
      instance: {
        port,
      },
    });
    await redisMemoryServer.getHost();
    await redisMemoryServer.getPort();
    console.log(`[redis] In-memory Redis server ready on ${host}:${port}`);
  } else {
    console.log(`[redis] Connected to existing Redis instance at ${host}:${port}`);
  }
}
