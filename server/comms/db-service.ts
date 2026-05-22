/**
 * DB Service — wraps every database operation used by the communication engine
 * with try-catch, exponential-backoff retry logic, and an in-memory fallback
 * store so the comms module keeps working when PostgreSQL is unavailable.
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
// Types
// ---------------------------------------------------------------------------

export type DbResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type DirectMessageRow = typeof directMessages.$inferSelect;
type CallHistoryRow   = typeof callHistory.$inferSelect;
type MeetingRoomRow   = typeof meetingRooms.$inferSelect;
type OnlineUserRow    = typeof onlineUsers.$inferSelect;
type GroupChatRow     = typeof groupChats.$inferSelect;

// ---------------------------------------------------------------------------
// In-memory fallback stores
// ---------------------------------------------------------------------------

const fallbackMessages: Map<string, DirectMessageRow>  = new Map();
const fallbackCalls:    Map<string, CallHistoryRow>    = new Map();
const fallbackRooms:    Map<string, MeetingRoomRow>    = new Map();
const fallbackUsers:    Map<string, OnlineUserRow>     = new Map();
const fallbackGroups:   Map<string, GroupChatRow>      = new Map();

// ---------------------------------------------------------------------------
// Circuit-breaker / health state
// ---------------------------------------------------------------------------

interface DbHealthState {
  isHealthy: boolean;
  lastCheckedAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
}

const healthState: DbHealthState = {
  isHealthy: true,
  lastCheckedAt: null,
  lastErrorAt: null,
  lastError: null,
  consecutiveFailures: 0,
};

/** Emits "db:up" / "db:down" when connectivity changes. */
export const dbEvents = new EventEmitter();

const CIRCUIT_OPEN_THRESHOLD = 3;   // failures before we stop trying
const CIRCUIT_HALF_OPEN_AFTER = 30_000; // ms before we probe again

let circuitOpenSince: number | null = null;

function isCircuitOpen(): boolean {
  if (healthState.consecutiveFailures < CIRCUIT_OPEN_THRESHOLD) return false;
  if (circuitOpenSince === null) {
    circuitOpenSince = Date.now();
    return true;
  }
  // Allow a single probe after the half-open window
  if (Date.now() - circuitOpenSince >= CIRCUIT_HALF_OPEN_AFTER) {
    circuitOpenSince = null; // reset so the next call is a probe
    return false;
  }
  return true;
}

function recordSuccess(): void {
  const wasDown = !healthState.isHealthy;
  healthState.isHealthy = true;
  healthState.consecutiveFailures = 0;
  healthState.lastCheckedAt = new Date();
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
  console.error(
    `[DbService] DB error (consecutive=${healthState.consecutiveFailures}): ${msg}`
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
        const delay = Math.min(200 * 2 ** (attempt - 1), 2_000); // 200 → 400 → 800 ms
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
    // Lightweight query — just ask the pool for a connection
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
// Direct Messages
// ---------------------------------------------------------------------------

export async function dbInsertMessage(
  values: typeof directMessages.$inferInsert
): Promise<DbResult<DirectMessageRow>> {
  if (isCircuitOpen()) {
    const fallback = { ...values, id: `fb_${Date.now()}`, createdAt: new Date(), isRead: false, readAt: null, reactions: null } as DirectMessageRow;
    fallbackMessages.set(fallback.id, fallback);
    console.log(`[DbService] Circuit open — message stored in fallback (id=${fallback.id})`);
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertMessage", () =>
      db.insert(directMessages).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = { ...values, id: `fb_${Date.now()}`, createdAt: new Date(), isRead: false, readAt: null, reactions: null } as DirectMessageRow;
    fallbackMessages.set(fallback.id, fallback);
    console.warn(`[DbService] insertMessage failed — stored in fallback (id=${fallback.id})`);
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
            and(eq(directMessages.senderId, userId), eq(directMessages.recipientId, otherUserId)),
            and(eq(directMessages.senderId, otherUserId), eq(directMessages.recipientId, userId))
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
    if (fb) fallbackMessages.set(messageId, { ...fb, isRead: true, readAt: new Date() });
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
    return { success: false, error: err instanceof Error ? err.message : String(err) };
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
    if (!reactions[reaction].includes(userId)) reactions[reaction].push(userId);
    fallbackMessages.set(messageId, { ...fb, reactions });
    return { success: true, data: reactions };
  }
  try {
    const [msg] = await withRetry("getMessageForReaction", () =>
      db.select().from(directMessages).where(eq(directMessages.id, messageId)).limit(1)
    );
    if (!msg) return { success: true, data: null };
    const reactions = ((msg.reactions as Record<string, string[]>) || {});
    if (!reactions[reaction]) reactions[reaction] = [];
    if (!reactions[reaction].includes(userId)) reactions[reaction].push(userId);
    await withRetry("addReaction", () =>
      db.update(directMessages).set({ reactions }).where(eq(directMessages.id, messageId))
    );
    return { success: true, data: reactions };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
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
    const fallback = { ...values, id: `fb_${Date.now()}`, createdAt: new Date() } as GroupChatRow;
    fallbackGroups.set(fallback.id, fallback);
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertGroupChat", () =>
      db.insert(groupChats).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = { ...values, id: `fb_${Date.now()}`, createdAt: new Date() } as GroupChatRow;
    fallbackGroups.set(fallback.id, fallback);
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
    const fallback = { ...values, id: `fb_${Date.now()}`, startedAt: new Date(), endedAt: null, duration: null, isRecording: false, recordingUrl: null, callQuality: "1.0", bandwidthKbps: "0", missedBy: null, declinedBy: null } as CallHistoryRow;
    fallbackCalls.set(fallback.id, fallback);
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertCall", () =>
      db.insert(callHistory).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = { ...values, id: `fb_${Date.now()}`, startedAt: new Date(), endedAt: null, duration: null, isRecording: false, recordingUrl: null, callQuality: "1.0", bandwidthKbps: "0", missedBy: null, declinedBy: null } as CallHistoryRow;
    fallbackCalls.set(fallback.id, fallback);
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
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Meeting Rooms
// ---------------------------------------------------------------------------

export async function dbInsertMeetingRoom(
  values: typeof meetingRooms.$inferInsert
): Promise<DbResult<MeetingRoomRow>> {
  if (isCircuitOpen()) {
    const fallback = { ...values, id: `fb_${Date.now()}`, createdAt: new Date(), isActive: true, endedAt: null, duration: null, isRecording: false, recordingUrl: null, screenSharingBy: null } as MeetingRoomRow;
    fallbackRooms.set(fallback.id, fallback);
    return { success: true, data: fallback };
  }
  try {
    const [row] = await withRetry("insertMeetingRoom", () =>
      db.insert(meetingRooms).values(values).returning()
    );
    return { success: true, data: row };
  } catch (err) {
    const fallback = { ...values, id: `fb_${Date.now()}`, createdAt: new Date(), isActive: true, endedAt: null, duration: null, isRecording: false, recordingUrl: null, screenSharingBy: null } as MeetingRoomRow;
    fallbackRooms.set(fallback.id, fallback);
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
      db.update(meetingRooms).set(values as any).where(eq(meetingRooms.roomCode, roomCode))
    );
    return { success: true, data: undefined };
  } catch (err) {
    for (const [id, room] of fallbackRooms) {
      if (room.roomCode === roomCode) {
        fallbackRooms.set(id, { ...room, ...values } as MeetingRoomRow);
      }
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Online Users / Presence
// ---------------------------------------------------------------------------

export async function dbUpsertOnlineUser(
  values: typeof onlineUsers.$inferInsert
): Promise<DbResult<void>> {
  if (isCircuitOpen()) {
    fallbackUsers.set(values.id, { ...values, lastSeen: new Date(), isOnline: values.isOnline ?? true } as OnlineUserRow);
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
    fallbackUsers.set(values.id, { ...values, lastSeen: new Date(), isOnline: values.isOnline ?? true } as OnlineUserRow);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
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
        await db.insert(directMessages).values(msg).onConflictDoNothing();
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
        await db.insert(callHistory).values(call).onConflictDoNothing();
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
        await db.insert(meetingRooms).values(room).onConflictDoNothing();
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
            set: { displayName: user.displayName, isOnline: user.isOnline, lastSeen: user.lastSeen, status: user.status },
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
        await db.insert(groupChats).values(group).onConflictDoNothing();
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
