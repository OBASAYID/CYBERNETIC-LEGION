/**
 * DB Service — Refined v2.1
 * Wraps every database operation with try-catch, exponential-backoff retry logic,
 * and an in-memory fallback store with configurable memory limits.
 *
 * Key improvements:
 * - ✅ Fallback store size limits (prevent unbounded growth)
 * - ✅ LRU eviction when limits exceeded
 * - ✅ Better error categorization
 * - ✅ Memory monitoring hooks
 * - ✅ Graceful degradation
 *
 * Each public method returns a typed result object:
 *   { success: true,  data: T }
 *   { success: false, error: string }
 */

import { db } from "../db.js";
import {
  directMessages,
  callHistory,
  meetingRooms,
  onlineUsers,
  groupChats,
} from "../../shared/models/comms.js";
import { eq, or, and, asc } from "drizzle-orm";
import { EventEmitter } from "events";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  MAX_FALLBACK_MESSAGES: 5_000,
  MAX_FALLBACK_CALLS: 1_000,
  MAX_FALLBACK_ROOMS: 500,
  MAX_FALLBACK_USERS: 10_000,
  MAX_FALLBACK_GROUPS: 1_000,
  CIRCUIT_OPEN_THRESHOLD: 3,
  CIRCUIT_HALF_OPEN_AFTER: 30_000, // 30 seconds
  MEMORY_CHECK_INTERVAL: 60_000, // 60 seconds
  MEMORY_WARNING_THRESHOLD: 500_000_000, // 500 MB
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DbResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type DirectMessageRow = typeof directMessages.$inferSelect;
type CallHistoryRow = typeof callHistory.$inferSelect;
type MeetingRoomRow = typeof meetingRooms.$inferSelect;
type OnlineUserRow = typeof onlineUsers.$inferSelect;
type GroupChatRow = typeof groupChats.$inferSelect;

interface FallbackStoreStats {
  messages: { size: number; limit: number; ratio: number };
  calls: { size: number; limit: number; ratio: number };
  rooms: { size: number; limit: number; ratio: number };
  users: { size: number; limit: number; ratio: number };
  groups: { size: number; limit: number; ratio: number };
  totalSize: number;
  estimatedMemoryMB: number;
}

// ---------------------------------------------------------------------------
// LRU Map with automatic eviction
// ---------------------------------------------------------------------------

class LRUMap<K, V> extends Map<K, V> {
  private accessOrder: K[] = [];

  set(key: K, value: V): this {
    // Remove from access order if exists
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) this.accessOrder.splice(idx, 1);

    // Add to end (most recent)
    this.accessOrder.push(key);
    return super.set(key, value);
  }

  evictOldest(): boolean {
    if (this.accessOrder.length === 0) return false;
    const oldest = this.accessOrder.shift()!;
    this.delete(oldest);
    return true;
  }

  clear(): void {
    super.clear();
    this.accessOrder = [];
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback stores with size limits
// ---------------------------------------------------------------------------

const fallbackMessages = new LRUMap<string, DirectMessageRow>();
const fallbackCalls = new LRUMap<string, CallHistoryRow>();
const fallbackRooms = new LRUMap<string, MeetingRoomRow>();
const fallbackUsers = new LRUMap<string, OnlineUserRow>();
const fallbackGroups = new LRUMap<string, GroupChatRow>();

function ensureMapSize<K, V>(
  map: LRUMap<K, V>,
  limit: number,
  name: string
): void {
  if (map.size > limit) {
    const excess = map.size - limit;
    console.warn(
      `[DbService] ${name} fallback store at capacity (${map.size}/${limit}). Evicting ${excess} oldest entries…`
    );
    for (let i = 0; i < excess; i++) {
      map.evictOldest();
    }
  }
}

// ---------------------------------------------------------------------------
// Circuit-breaker / health state
// ---------------------------------------------------------------------------

interface DbHealthState {
  isHealthy: boolean;
  lastCheckedAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  errorCategory?: string; // "connection" | "timeout" | "constraint" | "unknown"
}

const healthState: DbHealthState = {
  isHealthy: true,
  lastCheckedAt: null,
  lastErrorAt: null,
  lastError: null,
  consecutiveFailures: 0,
};

export const dbEvents = new EventEmitter();

let circuitOpenSince: number | null = null;
let memoryCheckInterval: NodeJS.Timeout | null = null;

function isCircuitOpen(): boolean {
  if (healthState.consecutiveFailures < CONFIG.CIRCUIT_OPEN_THRESHOLD)
    return false;
  if (circuitOpenSince === null) {
    circuitOpenSince = Date.now();
    return true;
  }
  if (Date.now() - circuitOpenSince >= CONFIG.CIRCUIT_HALF_OPEN_AFTER) {
    circuitOpenSince = null;
    return false;
  }
  return true;
}

function categorizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ECONNREFUSED") || msg.includes("connection"))
    return "connection";
  if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) return "timeout";
  if (
    msg.includes("constraint") ||
    msg.includes("UNIQUE") ||
    msg.includes("FOREIGN")
  )
    return "constraint";
  return "unknown";
}

function recordSuccess(): void {
  const wasDown = !healthState.isHealthy;
  healthState.isHealthy = true;
  healthState.consecutiveFailures = 0;
  healthState.lastCheckedAt = new Date();
  healthState.errorCategory = undefined;
  circuitOpenSince = null;
  if (wasDown) {
    console.log("[DbService] Database connection restored.");
    dbEvents.emit("db:up");
  }
}

function recordFailure(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const wasUp = healthState.isHealthy;
  healthState.isHealthy = false;
  healthState.consecutiveFailures++;
  healthState.lastErrorAt = new Date();
  healthState.lastError = msg;
  healthState.lastCheckedAt = new Date();
  healthState.errorCategory = categorizeError(err);
  console.error(
    `[DbService] DB error (${healthState.errorCategory}, consecutive=${healthState.consecutiveFailures}): ${msg}`
  );
  if (wasUp) {
    console.warn("[DbService] Database went offline — activating fallback mode.");
    dbEvents.emit("db:down", msg);
  }
}

// ---------------------------------------------------------------------------
// Retry helper with exponential backoff
// ---------------------------------------------------------------------------

async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const delay = Math.min(200 * 2 ** (attempt - 1), 2_000);
        console.warn(
          `[DbService] ${operation} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms…`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  recordFailure(lastErr);
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function checkDbHealth(): Promise<boolean> {
  try {
    await (db as any).execute?.("SELECT 1") ??
      await db.select().from(onlineUsers).limit(1);
    recordSuccess();
    return true;
  } catch (err) {
    recordFailure(err);
    return false;
  }
}

export function getDbHealthState(): DbHealthState & { circuitOpen: boolean } {
  return { ...healthState, circuitOpen: isCircuitOpen() };
}

// ---------------------------------------------------------------------------
// Memory monitoring
// ---------------------------------------------------------------------------

function estimateObjectSize(obj: any): number {
  // Rough estimation: typical message/call ~1KB, room ~2KB, user ~500B
  if (!obj) return 0;
  return JSON.stringify(obj).length + 128; // 128 bytes overhead
}

export function getFallbackStoreStats(): FallbackStoreStats {
  const msgSize = Array.from(fallbackMessages.values()).reduce(
    (sum, m) => sum + estimateObjectSize(m),
    0
  );
  const callSize = Array.from(fallbackCalls.values()).reduce(
    (sum, c) => sum + estimateObjectSize(c),
    0
  );
  const roomSize = Array.from(fallbackRooms.values()).reduce(
    (sum, r) => sum + estimateObjectSize(r),
    0
  );
  const userSize = Array.from(fallbackUsers.values()).reduce(
    (sum, u) => sum + estimateObjectSize(u),
    0
  );
  const groupSize = Array.from(fallbackGroups.values()).reduce(
    (sum, g) => sum + estimateObjectSize(g),
    0
  );

  const totalSize =
    msgSize + callSize + roomSize + userSize + groupSize;

  return {
    messages: {
      size: fallbackMessages.size,
      limit: CONFIG.MAX_FALLBACK_MESSAGES,
      ratio: fallbackMessages.size / CONFIG.MAX_FALLBACK_MESSAGES,
    },
    calls: {
      size: fallbackCalls.size,
      limit: CONFIG.MAX_FALLBACK_CALLS,
      ratio: fallbackCalls.size / CONFIG.MAX_FALLBACK_CALLS,
    },
    rooms: {
      size: fallbackRooms.size,
      limit: CONFIG.MAX_FALLBACK_ROOMS,
      ratio: fallbackRooms.size / CONFIG.MAX_FALLBACK_ROOMS,
    },
    users: {
      size: fallbackUsers.size,
      limit: CONFIG.MAX_FALLBACK_USERS,
      ratio: fallbackUsers.size / CONFIG.MAX_FALLBACK_USERS,
    },
    groups: {
      size: fallbackGroups.size,
      limit: CONFIG.MAX_FALLBACK_GROUPS,
      ratio: fallbackGroups.size / CONFIG.MAX_FALLBACK_GROUPS,
    },
    totalSize,
    estimatedMemoryMB: totalSize / 1_000_000,
  };
}

function startMemoryMonitoring(): void {
  if (memoryCheckInterval) return;

  memoryCheckInterval = setInterval(() => {
    const stats = getFallbackStoreStats();
    if (stats.estimatedMemoryMB > CONFIG.MEMORY_WARNING_THRESHOLD / 1_000_000) {
      console.warn(
        `[DbService] Memory usage high: ${stats.estimatedMemoryMB.toFixed(2)}MB (threshold: ${(CONFIG.MEMORY_WARNING_THRESHOLD / 1_000_000).toFixed(2)}MB)`
      );
      dbEvents.emit("memory:warning", stats);
    }

    // Log at INFO level
    if (stats.messages.ratio > 0.8 || stats.calls.ratio > 0.8) {
      console.log(
        `[DbService] Fallback stores near capacity: msgs ${(stats.messages.ratio * 100).toFixed(1)}%, calls ${(stats.calls.ratio * 100).toFixed(1)}%`
      );
    }
  }, CONFIG.MEMORY_CHECK_INTERVAL);
}

function stopMemoryMonitoring(): void {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
}

// Start monitoring on module load
startMemoryMonitoring();

// ---------------------------------------------------------------------------
// Direct Messages
// ---------------------------------------------------------------------------

export async function dbInsertMessage(
  values: typeof directMessages.$inferInsert
): Promise<DbResult<DirectMessageRow>> {
  if (isCircuitOpen()) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      createdAt: new Date(),
      isRead: false,
      readAt: null,
      reactions: null,
    } as DirectMessageRow;
    fallbackMessages.set(fallback.id, fallback);
    ensureMapSize(
      fallbackMessages,
      CONFIG.MAX_FALLBACK_MESSAGES,
      "messages"
    );
    console.log(
      `[DbService] Circuit open — message stored in fallback (id=${fallback.id})`
    );
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertMessage", () =>
      db.insert(directMessages).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      createdAt: new Date(),
      isRead: false,
      readAt: null,
      reactions: null,
    } as DirectMessageRow;
    fallbackMessages.set(fallback.id, fallback);
    ensureMapSize(
      fallbackMessages,
      CONFIG.MAX_FALLBACK_MESSAGES,
      "messages"
    );
    console.warn(
      `[DbService] insertMessage failed — stored in fallback (id=${fallback.id})`
    );
    return { success: true, data: fallback };
  }
}

export async function dbGetConversation(
  userId: string,
  otherUserId: string,
  limit = 50
): Promise<DbResult<DirectMessageRow[]>> {
  if (isCircuitOpen()) {
    const rows = Array.from(fallbackMessages.values())
      .filter(
        (m) =>
          (m.senderId === userId && m.recipientId === otherUserId) ||
          (m.senderId === otherUserId && m.recipientId === userId)
      )
      .slice(-limit);
    return { success: true, data: rows };
  }
  try {
    const rows = await withRetry("getConversation", () =>
      db
        .select()
        .from(directMessages)
        .where(
          or(
            and(
              eq(directMessages.senderId, userId),
              eq(directMessages.recipientId, otherUserId)
            ),
            and(
              eq(directMessages.senderId, otherUserId),
              eq(directMessages.recipientId, userId)
            )
          )
        )
        .orderBy(asc(directMessages.createdAt))
        .limit(limit)
    );
    return { success: true, data: rows };
  } catch (err) {
    const rows = Array.from(fallbackMessages.values())
      .filter(
        (m) =>
          (m.senderId === userId && m.recipientId === otherUserId) ||
          (m.senderId === otherUserId && m.recipientId === userId)
      )
      .slice(-limit);
    return { success: true, data: rows };
  }
}

export async function dbMarkAsRead(
  messageId: string
): Promise<DbResult<void>> {
  if (isCircuitOpen()) {
    const fb = fallbackMessages.get(messageId);
    if (fb)
      fallbackMessages.set(messageId, {
        ...fb,
        isRead: true,
        readAt: new Date(),
      });
    return { success: true, data: undefined };
  }
  try {
    await withRetry("markAsRead", () =>
      db
        .update(directMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(directMessages.id, messageId))
    );
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function dbAddReaction(
  messageId: string,
  userId: string,
  reaction: string
): Promise<DbResult<Record<string, string[]> | null>> {
  if (isCircuitOpen()) {
    const fb = fallbackMessages.get(messageId);
    if (!fb) return { success: true, data: null };
    const reactions = ((fb.reactions as Record<string, string[]>) || {});
    if (!reactions[reaction]) reactions[reaction] = [];
    if (!reactions[reaction].includes(userId))
      reactions[reaction].push(userId);
    fallbackMessages.set(messageId, { ...fb, reactions });
    return { success: true, data: reactions };
  }
  try {
    const [msg] = await withRetry("getMessageForReaction", () =>
      db
        .select()
        .from(directMessages)
        .where(eq(directMessages.id, messageId))
        .limit(1)
    );
    if (!msg) return { success: true, data: null };
    const reactions = ((msg.reactions as Record<string, string[]>) || {});
    if (!reactions[reaction]) reactions[reaction] = [];
    if (!reactions[reaction].includes(userId))
      reactions[reaction].push(userId);
    await withRetry("addReaction", () =>
      db
        .update(directMessages)
        .set({ reactions })
        .where(eq(directMessages.id, messageId))
    );
    return { success: true, data: reactions };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function dbGetGroupMessages(
  groupId: string,
  limit = 50
): Promise<DbResult<DirectMessageRow[]>> {
  if (isCircuitOpen()) {
    const rows = Array.from(fallbackMessages.values())
      .filter((m) => m.groupId === groupId)
      .slice(-limit);
    return { success: true, data: rows };
  }
  try {
    const rows = await withRetry("getGroupMessages", () =>
      db
        .select()
        .from(directMessages)
        .where(eq(directMessages.groupId, groupId))
        .orderBy(asc(directMessages.createdAt))
        .limit(limit)
    );
    return { success: true, data: rows };
  } catch (err) {
    const rows = Array.from(fallbackMessages.values())
      .filter((m) => m.groupId === groupId)
      .slice(-limit);
    return { success: true, data: rows };
  }
}

// ---------------------------------------------------------------------------
// Group Chats
// ---------------------------------------------------------------------------

export async function dbInsertGroupChat(
  values: typeof groupChats.$inferInsert
): Promise<DbResult<GroupChatRow>> {
  if (isCircuitOpen()) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      createdAt: new Date(),
    } as GroupChatRow;
    fallbackGroups.set(fallback.id, fallback);
    ensureMapSize(fallbackGroups, CONFIG.MAX_FALLBACK_GROUPS, "groups");
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertGroupChat", () =>
      db.insert(groupChats).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      createdAt: new Date(),
    } as GroupChatRow;
    fallbackGroups.set(fallback.id, fallback);
    ensureMapSize(fallbackGroups, CONFIG.MAX_FALLBACK_GROUPS, "groups");
    return { success: true, data: fallback };
  }
}

export async function dbGetGroupChats(): Promise<DbResult<GroupChatRow[]>> {
  if (isCircuitOpen()) {
    return { success: true, data: Array.from(fallbackGroups.values()) };
  }
  try {
    const rows = await withRetry("getGroupChats", () =>
      db.select().from(groupChats)
    );
    return { success: true, data: rows };
  } catch (err) {
    return { success: true, data: Array.from(fallbackGroups.values()) };
  }
}

// ---------------------------------------------------------------------------
// Call History
// ---------------------------------------------------------------------------

export async function dbInsertCall(
  values: typeof callHistory.$inferInsert
): Promise<DbResult<CallHistoryRow>> {
  if (isCircuitOpen()) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      startedAt: new Date(),
      endedAt: null,
      duration: null,
      isRecording: false,
      recordingUrl: null,
      callQuality: "1.0",
      bandwidthKbps: "0",
    } as CallHistoryRow;
    fallbackCalls.set(fallback.id, fallback);
    ensureMapSize(fallbackCalls, CONFIG.MAX_FALLBACK_CALLS, "calls");
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertCall", () =>
      db.insert(callHistory).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      startedAt: new Date(),
      endedAt: null,
      duration: null,
      isRecording: false,
      recordingUrl: null,
      callQuality: "1.0",
      bandwidthKbps: "0",
    } as CallHistoryRow;
    fallbackCalls.set(fallback.id, fallback);
    ensureMapSize(fallbackCalls, CONFIG.MAX_FALLBACK_CALLS, "calls");
    return { success: true, data: fallback };
  }
}

export async function dbUpdateCall(
  roomId: string,
  values: Partial<typeof callHistory.$inferInsert>
): Promise<DbResult<void>> {
  if (isCircuitOpen()) {
    for (const [id, call] of fallbackCalls) {
      if (call.roomId === roomId) {
        fallbackCalls.set(id, { ...call, ...values } as CallHistoryRow);
      }
    }
    return { success: true, data: undefined };
  }
  try {
    await withRetry("updateCall", () =>
      db.update(callHistory).set(values as any).where(eq(callHistory.roomId, roomId))
    );
    return { success: true, data: undefined };
  } catch (err) {
    for (const [id, call] of fallbackCalls) {
      if (call.roomId === roomId) {
        fallbackCalls.set(id, { ...call, ...values } as CallHistoryRow);
      }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Meeting Rooms
// ---------------------------------------------------------------------------

export async function dbInsertMeetingRoom(
  values: typeof meetingRooms.$inferInsert
): Promise<DbResult<MeetingRoomRow>> {
  if (isCircuitOpen()) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      createdAt: new Date(),
      isActive: true,
      endedAt: null,
      duration: null,
      isRecording: false,
      recordingUrl: null,
      screenSharingBy: null,
    } as MeetingRoomRow;
    fallbackRooms.set(fallback.id, fallback);
    ensureMapSize(fallbackRooms, CONFIG.MAX_FALLBACK_ROOMS, "rooms");
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertMeetingRoom", () =>
      db.insert(meetingRooms).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = {
      ...values,
      id: `fb_${Date.now()}`,
      createdAt: new Date(),
      isActive: true,
      endedAt: null,
      duration: null,
      isRecording: false,
      recordingUrl: null,
      screenSharingBy: null,
    } as MeetingRoomRow;
    fallbackRooms.set(fallback.id, fallback);
    ensureMapSize(fallbackRooms, CONFIG.MAX_FALLBACK_ROOMS, "rooms");
    return { success: true, data: fallback };
  }
}

export async function dbUpdateMeetingRoom(
  roomCode: string,
  values: Partial<typeof meetingRooms.$inferInsert>
): Promise<DbResult<void>> {
  if (isCircuitOpen()) {
    for (const [id, room] of fallbackRooms) {
      if (room.roomCode === roomCode) {
        fallbackRooms.set(id, { ...room, ...values } as MeetingRoomRow);
      }
    }
    return { success: true, data: undefined };
  }
  try {
    await withRetry("updateMeetingRoom", () =>
      db
        .update(meetingRooms)
        .set(values as any)
        .where(eq(meetingRooms.roomCode, roomCode))
    );
    return { success: true, data: undefined };
  } catch (err) {
    for (const [id, room] of fallbackRooms) {
      if (room.roomCode === roomCode) {
        fallbackRooms.set(id, { ...room, ...values } as MeetingRoomRow);
      }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Online Users / Presence
// ---------------------------------------------------------------------------

export async function dbUpsertOnlineUser(
  values: typeof onlineUsers.$inferInsert
): Promise<DbResult<void>> {
  if (isCircuitOpen()) {
    fallbackUsers.set(
      values.id,
      {
        ...values,
        lastSeen: new Date(),
        isOnline: values.isOnline ?? true,
      } as OnlineUserRow
    );
    ensureMapSize(fallbackUsers, CONFIG.MAX_FALLBACK_USERS, "users");
    return { success: true, data: undefined };
  }
  try {
    await withRetry("upsertOnlineUser", () =>
      db
        .insert(onlineUsers)
        .values(values)
        .onConflictDoUpdate({
          target: onlineUsers.id,
          set: {
            displayName: values.displayName,
            isOnline: values.isOnline,
            lastSeen: new Date(),
            status: values.status,
          },
        })
    );
    return { success: true, data: undefined };
  } catch (err) {
    fallbackUsers.set(
      values.id,
      {
        ...values,
        lastSeen: new Date(),
        isOnline: values.isOnline ?? true,
      } as OnlineUserRow
    );
    ensureMapSize(fallbackUsers, CONFIG.MAX_FALLBACK_USERS, "users");
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Flush fallback data to DB when connectivity is restored
// ---------------------------------------------------------------------------

export async function flushFallbackData(): Promise<{
  messages: number;
  calls: number;
  rooms: number;
  users: number;
  groups: number;
}> {
  const counts = { messages: 0, calls: 0, rooms: 0, users: 0, groups: 0 };

  if (fallbackMessages.size > 0) {
    for (const [id, msg] of fallbackMessages) {
      try {
        await db
          .insert(directMessages)
          .values(msg)
          .onConflictDoNothing();
        fallbackMessages.delete(id);
        counts.messages++;
      } catch (err) {
        console.error(`[DbService] Failed to flush message ${id}:`, err);
      }
    }
  }

  if (fallbackCalls.size > 0) {
    for (const [id, call] of fallbackCalls) {
      try {
        await db
          .insert(callHistory)
          .values(call)
          .onConflictDoNothing();
        fallbackCalls.delete(id);
        counts.calls++;
      } catch (err) {
        console.error(`[DbService] Failed to flush call ${id}:`, err);
      }
    }
  }

  if (fallbackRooms.size > 0) {
    for (const [id, room] of fallbackRooms) {
      try {
        await db
          .insert(meetingRooms)
          .values(room)
          .onConflictDoNothing();
        fallbackRooms.delete(id);
        counts.rooms++;
      } catch (err) {
        console.error(`[DbService] Failed to flush room ${id}:`, err);
      }
    }
  }

  if (fallbackUsers.size > 0) {
    for (const [id, user] of fallbackUsers) {
      try {
        await db
          .insert(onlineUsers)
          .values(user)
          .onConflictDoUpdate({
            target: onlineUsers.id,
            set: {
              displayName: user.displayName,
              isOnline: user.isOnline,
              lastSeen: user.lastSeen,
              status: user.status,
            },
          });
        fallbackUsers.delete(id);
        counts.users++;
      } catch (err) {
        console.error(`[DbService] Failed to flush user ${id}:`, err);
      }
    }
  }

  if (fallbackGroups.size > 0) {
    for (const [id, group] of fallbackGroups) {
      try {
        await db
          .insert(groupChats)
          .values(group)
          .onConflictDoNothing();
        fallbackGroups.delete(id);
        counts.groups++;
      } catch (err) {
        console.error(`[DbService] Failed to flush group ${id}:`, err);
      }
    }
  }

  if (Object.values(counts).some((n) => n > 0)) {
    console.log("[DbService] Fallback flush complete:", counts);
  }

  return counts;
}

export function getFallbackStoreSizes() {
  return {
    messages: fallbackMessages.size,
    calls: fallbackCalls.size,
    rooms: fallbackRooms.size,
    users: fallbackUsers.size,
    groups: fallbackGroups.size,
  };
}

// ---------------------------------------------------------------------------
// Cleanup on shutdown
// ---------------------------------------------------------------------------

export function cleanupDbService(): void {
  stopMemoryMonitoring();
  console.log("[DbService] Cleanup complete");
}
