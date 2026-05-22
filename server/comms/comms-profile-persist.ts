import { db } from "../db.js";
import { onlineUsers } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

export type CommsDeviceInfo = {
  onlineSince?: string;
  lastLocation?: { lat: number; lng: number; accuracy?: number; at: string };
  /** When true, last GPS fixes are stored for the operations roster / ground team map. */
  locationShareEnabled?: boolean;
};

export function parseDeviceInfo(raw: unknown): CommsDeviceInfo {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as CommsDeviceInfo;
}

const shareCache = new Map<string, boolean>();
const lastPersistAt = new Map<string, number>();
const PERSIST_MS = 8000;

export function invalidateLocationShareCache(userId: string) {
  shareCache.delete(userId);
}

async function readLocationShareEnabled(userId: string): Promise<boolean> {
  const cached = shareCache.get(userId);
  if (cached !== undefined) return cached;
  const [row] = await db
    .select({ deviceInfo: onlineUsers.deviceInfo })
    .from(onlineUsers)
    .where(eq(onlineUsers.id, userId))
    .limit(1);
  const v = parseDeviceInfo(row?.deviceInfo).locationShareEnabled === true;
  shareCache.set(userId, v);
  return v;
}

export async function setLocationShareEnabled(userId: string, enabled: boolean) {
  const [existing] = await db.select().from(onlineUsers).where(eq(onlineUsers.id, userId)).limit(1);
  const di = parseDeviceInfo(existing?.deviceInfo);
  const next: CommsDeviceInfo = { ...di, locationShareEnabled: enabled };
  if (!enabled) {
    delete next.lastLocation;
  }
  await db
    .insert(onlineUsers)
    .values({
      id: userId,
      displayName: existing?.displayName || "User",
      email: existing?.email ?? null,
      profileImageUrl: existing?.profileImageUrl ?? null,
      lastSeen: new Date(),
      isOnline: existing?.isOnline ?? true,
      socketId: existing?.socketId ?? null,
      deviceInfo: next,
    })
    .onConflictDoUpdate({
      target: onlineUsers.id,
      set: {
        deviceInfo: next,
        lastSeen: new Date(),
      },
    });
  shareCache.set(userId, enabled);
}

export async function persistLastKnownLocation(
  userId: string,
  lat: number,
  lng: number,
  accuracy?: number,
  displayName?: string,
) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const allowed = await readLocationShareEnabled(userId);
  if (!allowed) return;
  const now = Date.now();
  const prev = lastPersistAt.get(userId) || 0;
  if (now - prev < PERSIST_MS) return;
  lastPersistAt.set(userId, now);

  const [existing] = await db.select().from(onlineUsers).where(eq(onlineUsers.id, userId)).limit(1);
  const di = parseDeviceInfo(existing?.deviceInfo);
  const next: CommsDeviceInfo = {
    ...di,
    locationShareEnabled: true,
    lastLocation: {
      lat,
      lng,
      accuracy,
      at: new Date().toISOString(),
    },
  };

  await db
    .insert(onlineUsers)
    .values({
      id: userId,
      displayName: displayName || existing?.displayName || "User",
      email: existing?.email ?? null,
      profileImageUrl: existing?.profileImageUrl ?? null,
      lastSeen: new Date(),
      isOnline: true,
      socketId: existing?.socketId ?? null,
      deviceInfo: next,
    })
    .onConflictDoUpdate({
      target: onlineUsers.id,
      set: {
        displayName: displayName || existing?.displayName || userId,
        deviceInfo: next,
        lastSeen: new Date(),
        isOnline: true,
      },
    });
}

/** When coming online, stamp `onlineSince` once per session; clear when offline. */
export function mergeDeviceInfoForOnlineTransition(
  existingDeviceInfo: unknown,
  nextIsOnline: boolean,
): CommsDeviceInfo {
  const di = parseDeviceInfo(existingDeviceInfo);
  const out: CommsDeviceInfo = { ...di };
  if (nextIsOnline !== false) {
    if (!out.onlineSince) {
      out.onlineSince = new Date().toISOString();
    }
  } else {
    delete out.onlineSince;
  }
  return out;
}
