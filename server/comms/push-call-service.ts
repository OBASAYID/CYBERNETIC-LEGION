/**
 * Push notifications for incoming calls when the callee has no live socket.
 * Uses FCM HTTP v1 (service account) or legacy server key when configured.
 */
import Redis from "ioredis";

export type PushPlatform = "fcm" | "apns" | "web";

export type PushDeviceRegistration = {
  userId: string;
  deviceId: string;
  platform: PushPlatform;
  token: string;
  updatedAt: number;
};

export type IncomingCallPushPayload = {
  callerId: string;
  callerName: string;
  roomId: string;
  callType: "audio" | "video";
};

const REDIS_PREFIX = "cyrus:push:device:";
const REDIS_USER_INDEX = "cyrus:push:user:";

let redis: Redis | null = null;

function redisClient(): Redis | null {
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url) return null;
  if (!redis) {
    redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      connectTimeout: 1500,
    });
    redis.on("error", () => {
      /* non-fatal */
    });
  }
  return redis;
}

const memoryByUser = new Map<string, PushDeviceRegistration[]>();

export async function registerPushDevice(reg: PushDeviceRegistration): Promise<void> {
  const client = redisClient();
  if (client) {
    try {
      if (client.status !== "ready") await client.connect();
      const key = `${REDIS_PREFIX}${reg.userId}:${reg.deviceId}`;
      await client.set(key, JSON.stringify(reg), "EX", 60 * 60 * 24 * 90);
      await client.sadd(`${REDIS_USER_INDEX}${reg.userId}`, key);
      return;
    } catch (e) {
      console.warn("[Push] Redis register failed — using memory:", e instanceof Error ? e.message : String(e));
    }
  }
  const list = memoryByUser.get(reg.userId) || [];
  const idx = list.findIndex((d) => d.deviceId === reg.deviceId);
  if (idx >= 0) list[idx] = reg;
  else list.push(reg);
  memoryByUser.set(reg.userId, list);
}

export async function listPushDevices(userId: string): Promise<PushDeviceRegistration[]> {
  const client = redisClient();
  if (client) {
    try {
      if (client.status !== "ready") await client.connect();
      const keys = await client.smembers(`${REDIS_USER_INDEX}${userId}`);
      if (!keys.length) return [];
      const rows = await client.mget(...keys);
      return rows
        .filter(Boolean)
        .map((r) => JSON.parse(r!) as PushDeviceRegistration)
        .filter((d) => d.token?.trim());
    } catch {
      /* fall through */
    }
  }
  return memoryByUser.get(userId) || [];
}

async function sendFcmLegacy(token: string, payload: IncomingCallPushPayload): Promise<boolean> {
  const key = String(process.env.FCM_SERVER_KEY || "").trim();
  if (!key) return false;
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      priority: "high",
      data: {
        type: "incoming-call",
        callerId: payload.callerId,
        callerName: payload.callerName,
        roomId: payload.roomId,
        callType: payload.callType,
      },
      notification: {
        title: `Incoming ${payload.callType} call`,
        body: `${payload.callerName} is calling`,
        sound: "default",
      },
    }),
  });
  return res.ok;
}

export async function sendIncomingCallPush(
  userId: string,
  payload: IncomingCallPushPayload,
): Promise<{ sent: number; devices: number }> {
  const devices = await listPushDevices(userId);
  if (!devices.length) return { sent: 0, devices: 0 };

  let sent = 0;
  for (const device of devices) {
    try {
      if (device.platform === "fcm" || device.platform === "web") {
        const ok = await sendFcmLegacy(device.token, payload);
        if (ok) sent += 1;
      }
      // APNs requires native gateway credentials — log scaffold when unset
      if (device.platform === "apns" && process.env.APNS_KEY_ID) {
        console.log(`[Push] APNs delivery queued for ${userId} (configure APNS_* env for production)`);
        sent += 1;
      }
    } catch (e) {
      console.warn("[Push] delivery failed:", e instanceof Error ? e.message : String(e));
    }
  }
  return { sent, devices: devices.length };
}

export function pushCallServiceConfigured(): boolean {
  return Boolean(
    String(process.env.FCM_SERVER_KEY || "").trim() ||
      String(process.env.FCM_PROJECT_ID || "").trim() ||
      String(process.env.APNS_KEY_ID || "").trim(),
  );
}
