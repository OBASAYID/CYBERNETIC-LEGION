import Redis from "ioredis";

type CommsFanoutMessage = {
  id: string;
  source: string;
  userId: string;
  eventType: string;
  payload: Record<string, unknown>;
  commsEvent?: Record<string, unknown>;
  ts: number;
};

const COMMS_FANOUT_CHANNEL = "cyrus:comms:fanout:v1";
const MESSAGE_ID_TTL_MS = 2 * 60 * 1000;

let redisPub: Redis | null = null;
let redisSub: Redis | null = null;
let fanoutReady = false;
let connectAttempted = false;
let handler: ((message: CommsFanoutMessage) => void) | null = null;
let instanceId = `node_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
const seenMessageIds = new Map<string, number>();

function redisEnabled(): boolean {
  return Boolean(String(process.env.REDIS_URL || "").trim());
}

function pruneSeenMessageIds(now = Date.now()): void {
  for (const [id, ts] of seenMessageIds.entries()) {
    if (now - ts > MESSAGE_ID_TTL_MS) {
      seenMessageIds.delete(id);
    }
  }
}

async function ensureFanout(): Promise<boolean> {
  if (!redisEnabled()) return false;
  if (fanoutReady && redisPub && redisSub) return true;
  if (connectAttempted) return false;
  connectAttempted = true;
  try {
    const redisUrl = String(process.env.REDIS_URL);
    redisPub = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      reconnectOnError: () => false,
      connectTimeout: 1200,
    });
    redisSub = redisPub.duplicate({
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      reconnectOnError: () => false,
      connectTimeout: 1200,
    });

    redisPub.on("error", () => {
      fanoutReady = false;
    });
    redisSub.on("error", () => {
      fanoutReady = false;
    });

    await redisPub.connect();
    await redisSub.connect();
    await redisSub.subscribe(COMMS_FANOUT_CHANNEL);
    redisSub.on("message", (_channel, raw) => {
      if (!handler) return;
      try {
        const parsed = JSON.parse(raw) as CommsFanoutMessage;
        if (!parsed?.id || !parsed?.userId || !parsed?.eventType) return;
        if (parsed.source === instanceId) return;
        pruneSeenMessageIds();
        if (seenMessageIds.has(parsed.id)) return;
        seenMessageIds.set(parsed.id, Date.now());
        handler(parsed);
      } catch {
        /* ignore malformed fanout message */
      }
    });
    fanoutReady = true;
    return true;
  } catch {
    fanoutReady = false;
    return false;
  }
}

export async function initCommsFanout(
  sourceInstanceId: string,
  onMessage: (message: CommsFanoutMessage) => void,
): Promise<boolean> {
  instanceId = sourceInstanceId || instanceId;
  handler = onMessage;
  return ensureFanout();
}

export async function publishCommsFanout(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
  commsEvent?: Record<string, unknown>,
): Promise<boolean> {
  const ok = await ensureFanout();
  if (!ok || !redisPub) return false;
  const message: CommsFanoutMessage = {
    id: `fan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    source: instanceId,
    userId,
    eventType,
    payload,
    commsEvent,
    ts: Date.now(),
  };
  try {
    pruneSeenMessageIds();
    seenMessageIds.set(message.id, message.ts);
    await redisPub.publish(COMMS_FANOUT_CHANNEL, JSON.stringify(message));
    return true;
  } catch {
    fanoutReady = false;
    return false;
  }
}
