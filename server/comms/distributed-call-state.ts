import Redis from "ioredis";

export type PendingCallState = {
  callerId: string;
  callerName: string;
  targetId: string;
  roomId: string;
  callType: "audio" | "video";
  timestamp: string;
};

export type ActiveCallState = {
  roomId: string;
  participants: string[];
  callType: "audio" | "video";
  startedAt: string;
  screenSharingBy?: string;
  hostPeerId: string;
  sfuMode?: "mediasoup" | "star" | "p2p";
};

const FALLBACK_PENDING = new Map<string, PendingCallState>();
const FALLBACK_ACTIVE = new Map<string, ActiveCallState>();
const FALLBACK_ACTIVE_BY_USER = new Map<string, Set<string>>();

let redis: Redis | null = null;
let redisAvailable = false;
let redisConnectAttempted = false;

function activeCallUserKey(userId: string): string {
  return `comms:active-call:user:${userId}`;
}

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
      reconnectOnError: () => false,
      connectTimeout: 1200,
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

export async function setPendingCallState(roomId: string, state: PendingCallState): Promise<void> {
  FALLBACK_PENDING.set(roomId, state);
  const r = await ensureRedis();
  if (!r) return;
  try {
    await r.set(`comms:pending-call:${roomId}`, JSON.stringify(state), "EX", 60 * 10);
  } catch {
    redisAvailable = false;
  }
}

export async function getPendingCallState(roomId: string): Promise<PendingCallState | null> {
  const local = FALLBACK_PENDING.get(roomId);
  if (local) return local;
  const r = await ensureRedis();
  if (!r) return null;
  try {
    const raw = await r.get(`comms:pending-call:${roomId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCallState;
    FALLBACK_PENDING.set(roomId, parsed);
    return parsed;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function deletePendingCallState(roomId: string): Promise<void> {
  FALLBACK_PENDING.delete(roomId);
  const r = await ensureRedis();
  if (!r) return;
  try {
    await r.del(`comms:pending-call:${roomId}`);
  } catch {
    redisAvailable = false;
  }
}

export async function setActiveCallState(roomId: string, state: ActiveCallState): Promise<void> {
  const previous = FALLBACK_ACTIVE.get(roomId);
  if (previous) {
    for (const participantId of previous.participants) {
      const set = FALLBACK_ACTIVE_BY_USER.get(participantId);
      if (!set) continue;
      set.delete(roomId);
      if (set.size === 0) FALLBACK_ACTIVE_BY_USER.delete(participantId);
    }
  }
  FALLBACK_ACTIVE.set(roomId, state);
  for (const participantId of state.participants) {
    const set = FALLBACK_ACTIVE_BY_USER.get(participantId) || new Set<string>();
    set.add(roomId);
    FALLBACK_ACTIVE_BY_USER.set(participantId, set);
  }
  const r = await ensureRedis();
  if (!r) return;
  try {
    await r.set(`comms:active-call:${roomId}`, JSON.stringify(state), "EX", 60 * 60 * 3);
    await r.sadd("comms:active-call:index", roomId);
    for (const participantId of state.participants) {
      const byUserKey = activeCallUserKey(participantId);
      await r.sadd(byUserKey, roomId);
      await r.expire(byUserKey, 60 * 60 * 3);
    }
  } catch {
    redisAvailable = false;
  }
}

export async function getActiveCallState(roomId: string): Promise<ActiveCallState | null> {
  const local = FALLBACK_ACTIVE.get(roomId);
  if (local) return local;
  const r = await ensureRedis();
  if (!r) return null;
  try {
    const raw = await r.get(`comms:active-call:${roomId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveCallState;
    FALLBACK_ACTIVE.set(roomId, parsed);
    return parsed;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function deleteActiveCallState(roomId: string): Promise<void> {
  const existing = FALLBACK_ACTIVE.get(roomId);
  FALLBACK_ACTIVE.delete(roomId);
  if (existing) {
    for (const participantId of existing.participants) {
      const set = FALLBACK_ACTIVE_BY_USER.get(participantId);
      if (!set) continue;
      set.delete(roomId);
      if (set.size === 0) FALLBACK_ACTIVE_BY_USER.delete(participantId);
    }
  }
  const r = await ensureRedis();
  if (!r) return;
  try {
    let participants: string[] = existing?.participants || [];
    if (!participants.length) {
      const raw = await r.get(`comms:active-call:${roomId}`);
      if (raw) {
        try {
          participants = (JSON.parse(raw) as ActiveCallState).participants || [];
        } catch {
          /* ignore malformed */
        }
      }
    }
    await r.del(`comms:active-call:${roomId}`);
    await r.srem("comms:active-call:index", roomId);
    if (participants.length) {
      for (const participantId of participants) {
        await r.srem(activeCallUserKey(participantId), roomId);
      }
    }
  } catch {
    redisAvailable = false;
  }
}

export async function getActiveCallStateForUser(userId: string): Promise<ActiveCallState | null> {
  const fallbackRooms = FALLBACK_ACTIVE_BY_USER.get(userId);
  if (fallbackRooms?.size) {
    for (const roomId of fallbackRooms) {
      const state = FALLBACK_ACTIVE.get(roomId);
      if (state) return state;
    }
  }
  const r = await ensureRedis();
  if (!r) return null;
  try {
    const roomIds = await r.smembers(activeCallUserKey(userId));
    if (!roomIds.length) return null;
    const values = await r.mget(roomIds.map((id) => `comms:active-call:${id}`));
    for (const value of values) {
      if (!value) continue;
      try {
        const parsed = JSON.parse(value) as ActiveCallState;
        FALLBACK_ACTIVE.set(parsed.roomId, parsed);
        for (const participantId of parsed.participants) {
          const set = FALLBACK_ACTIVE_BY_USER.get(participantId) || new Set<string>();
          set.add(parsed.roomId);
          FALLBACK_ACTIVE_BY_USER.set(participantId, set);
        }
        return parsed;
      } catch {
        /* ignore malformed entries */
      }
    }
    return null;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function listActiveCallStates(): Promise<ActiveCallState[]> {
  if (FALLBACK_ACTIVE.size > 0) {
    return Array.from(FALLBACK_ACTIVE.values());
  }
  const r = await ensureRedis();
  if (!r) return [];
  try {
    const roomIds = await r.smembers("comms:active-call:index");
    if (!roomIds.length) return [];
    const values = await r.mget(roomIds.map((id) => `comms:active-call:${id}`));
    const out: ActiveCallState[] = [];
    for (let idx = 0; idx < values.length; idx += 1) {
      const value = values[idx];
      const roomId = roomIds[idx];
      if (!value) {
        await r.srem("comms:active-call:index", roomId);
        continue;
      }
      try {
        const parsed = JSON.parse(value) as ActiveCallState;
        out.push(parsed);
        FALLBACK_ACTIVE.set(parsed.roomId, parsed);
        for (const participantId of parsed.participants) {
          const set = FALLBACK_ACTIVE_BY_USER.get(participantId) || new Set<string>();
          set.add(parsed.roomId);
          FALLBACK_ACTIVE_BY_USER.set(participantId, set);
        }
      } catch {
        await r.srem("comms:active-call:index", roomId);
      }
    }
    return out;
  } catch {
    redisAvailable = false;
    return [];
  }
}
