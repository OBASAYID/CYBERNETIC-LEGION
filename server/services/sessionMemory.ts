import Redis from "ioredis";

const SESSION_LIMIT = 10;
const memoryFallback = new Map<string, unknown[]>();

const redis = new Redis({
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: () => null,
  reconnectOnError: () => false,
});

redis.on("error", () => {
  redisAvailable = false;
});

let redisAvailable = false;
let connectionAttempted = false;

async function ensureRedisConnection() {
  if (redisAvailable) {
    return true;
  }

  if (connectionAttempted) {
    return false;
  }

  connectionAttempted = true;

  try {
    await redis.connect();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

export async function storeSession(userId: string, data: unknown) {
  const safeUserId = userId?.trim() || "anonymous";
  const payload = JSON.stringify(data);

  if (await ensureRedisConnection()) {
    await redis.lpush(`session:${safeUserId}`, payload);
    await redis.ltrim(`session:${safeUserId}`, 0, SESSION_LIMIT - 1);
    return;
  }

  const history = memoryFallback.get(safeUserId) ?? [];
  history.unshift(data);
  memoryFallback.set(safeUserId, history.slice(0, SESSION_LIMIT));
}

export async function getSession(userId: string) {
  const safeUserId = userId?.trim() || "anonymous";

  if (await ensureRedisConnection()) {
    const items = await redis.lrange(`session:${safeUserId}`, 0, SESSION_LIMIT - 1);
    return items.map((item) => JSON.parse(item));
  }

  return memoryFallback.get(safeUserId) ?? [];
}
