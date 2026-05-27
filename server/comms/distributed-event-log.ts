import Redis from "ioredis";

export type CommsUserEvent = {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  ts: number;
};

const MAX_EVENTS_PER_USER = 500;
const REDIS_TIMEOUT_MS = 1200;

const memoryEvents = new Map<string, CommsUserEvent[]>();
const memorySeq = new Map<string, number>();

let redis: Redis | null = null;
let redisConnectAttempted = false;
let redisAvailable = false;

function redisEnabled(): boolean {
  return Boolean(String(process.env.REDIS_URL || "").trim());
}

async function ensureRedis(): Promise<Redis | null> {
  if (!redisEnabled()) return null;
  if (redisAvailable && redis) return redis;
  if (redisConnectAttempted) return null;
  redisConnectAttempted = true;

  try {
    redis = new Redis(String(process.env.REDIS_URL), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      connectTimeout: REDIS_TIMEOUT_MS,
      reconnectOnError: () => false,
    });
    redis.on("error", () => {
      redisAvailable = false;
    });
    await redis.connect();
    redisAvailable = true;
    return redis;
  } catch {
    redisAvailable = false;
    return null;
  }
}

function memoryAppend(userId: string, type: string, payload: Record<string, unknown>): CommsUserEvent {
  const next = (memorySeq.get(userId) || 0) + 1;
  memorySeq.set(userId, next);
  const evt: CommsUserEvent = {
    seq: next,
    type,
    payload,
    ts: Date.now(),
  };
  const current = memoryEvents.get(userId) || [];
  current.push(evt);
  if (current.length > MAX_EVENTS_PER_USER) {
    current.splice(0, current.length - MAX_EVENTS_PER_USER);
  }
  memoryEvents.set(userId, current);
  return evt;
}

function memoryReadSince(userId: string, sinceSeq: number, limit: number): CommsUserEvent[] {
  const current = memoryEvents.get(userId) || [];
  return current.filter((e) => e.seq > sinceSeq).slice(0, limit);
}

export async function appendCommsUserEvent(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<CommsUserEvent> {
  const safeUserId = userId.trim();
  if (!safeUserId) {
    return {
      seq: 0,
      type,
      payload,
      ts: Date.now(),
    };
  }

  const redisClient = await ensureRedis();
  if (!redisClient) {
    return memoryAppend(safeUserId, type, payload);
  }

  try {
    const seq = await redisClient.incr(`comms:events:${safeUserId}:seq`);
    const evt: CommsUserEvent = {
      seq,
      type,
      payload,
      ts: Date.now(),
    };
    await redisClient.rpush(`comms:events:${safeUserId}:list`, JSON.stringify(evt));
    await redisClient.ltrim(`comms:events:${safeUserId}:list`, -MAX_EVENTS_PER_USER, -1);
    return evt;
  } catch {
    redisAvailable = false;
    return memoryAppend(safeUserId, type, payload);
  }
}

export async function readCommsUserEventsSince(
  userId: string,
  sinceSeq: number,
  limit = 200,
): Promise<CommsUserEvent[]> {
  const safeUserId = userId.trim();
  if (!safeUserId) return [];

  const redisClient = await ensureRedis();
  if (!redisClient) {
    return memoryReadSince(safeUserId, sinceSeq, limit);
  }

  try {
    const raw = await redisClient.lrange(`comms:events:${safeUserId}:list`, 0, -1);
    const decoded: CommsUserEvent[] = [];
    for (const line of raw) {
      try {
        const parsed = JSON.parse(line) as CommsUserEvent;
        if (typeof parsed.seq === "number" && parsed.seq > sinceSeq) {
          decoded.push(parsed);
        }
      } catch {
        /* ignore malformed lines */
      }
    }
    return decoded.slice(0, limit);
  } catch {
    redisAvailable = false;
    return memoryReadSince(safeUserId, sinceSeq, limit);
  }
}
