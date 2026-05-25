import crypto from "crypto";
import { pool } from "../db.js";

export type EventType =
  | "login_success"
  | "login_failed"
  | "login_blocked"
  | "logout"
  | "session_revoked"
  | "user_blocked"
  | "user_unblocked"
  | "user_removed";

export interface ActivityEntry {
  id: number;
  username: string | null;
  eventType: EventType;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface SessionEntry {
  tokenHash: string;
  username: string;
  role: string;
  loginAt: string;
  lastSeenAt: string;
  ipAddress: string | null;
  revoked: boolean;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 64);
}

function getIp(req: any): string | null {
  const forwarded = req?.get?.("x-forwarded-for");
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req?.ip ?? req?.connection?.remoteAddress ?? null;
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export async function logActivity(params: {
  username?: string | null;
  eventType: EventType;
  details?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO auth_activity_log (username, event_type, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [params.username ?? null, params.eventType, params.details ?? null, params.ipAddress ?? null],
    );
  } catch (err) {
    console.warn("[Auth] Failed to write activity log:", err);
  }
}

export async function getActivityLog(limit = 50): Promise<ActivityEntry[]> {
  const res = await pool.query(
    `SELECT id, username, event_type, details, ip_address, created_at
     FROM auth_activity_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    username: r.username,
    eventType: r.event_type as EventType,
    details: r.details,
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  }));
}

export function logActivityFromReq(
  req: any,
  eventType: EventType,
  username?: string | null,
  details?: string | null,
): void {
  void logActivity({ username, eventType, details, ipAddress: getIp(req) });
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function recordSession(params: {
  token: string;
  username: string;
  role: string;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    const hash = hashToken(params.token);
    await pool.query(
      `INSERT INTO auth_sessions (token_hash, username, role, ip_address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token_hash) DO UPDATE SET last_seen_at = NOW()`,
      [hash, params.username, params.role, params.ipAddress ?? null],
    );
  } catch (err) {
    console.warn("[Auth] Failed to record session:", err);
  }
}

export async function touchSession(token: string): Promise<void> {
  try {
    const hash = hashToken(token);
    await pool.query(
      `UPDATE auth_sessions SET last_seen_at = NOW() WHERE token_hash = $1 AND revoked = FALSE`,
      [hash],
    );
  } catch {
    // non-fatal
  }
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const hash = hashToken(token);
    const res = await pool.query(
      `SELECT revoked FROM auth_sessions WHERE token_hash = $1`,
      [hash],
    );
    if (res.rows.length === 0) return false;
    return res.rows[0].revoked === true;
  } catch {
    return false;
  }
}

export async function revokeSessionByHash(tokenHash: string): Promise<void> {
  await pool.query(
    `UPDATE auth_sessions SET revoked = TRUE WHERE token_hash = $1`,
    [tokenHash],
  );
}

export async function revokeAllSessionsForUser(username: string): Promise<number> {
  const res = await pool.query(
    `UPDATE auth_sessions SET revoked = TRUE WHERE username = $1 AND revoked = FALSE`,
    [username],
  );
  return res.rowCount ?? 0;
}

export async function getActiveSessions(): Promise<SessionEntry[]> {
  const res = await pool.query(
    `SELECT token_hash, username, role, login_at, last_seen_at, ip_address, revoked
     FROM auth_sessions
     WHERE revoked = FALSE
     ORDER BY last_seen_at DESC
     LIMIT 200`,
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    tokenHash: r.token_hash,
    username: r.username,
    role: r.role,
    loginAt: r.login_at,
    lastSeenAt: r.last_seen_at,
    ipAddress: r.ip_address,
    revoked: r.revoked,
  }));
}

export async function removeUserSessions(username: string): Promise<void> {
  await pool.query(`DELETE FROM auth_sessions WHERE username = $1`, [username]);
}

// ─── Blocked Users ────────────────────────────────────────────────────────────

const BLOCKED_KEY = "auth.blocked_users";

async function getBlockedSet(): Promise<Set<string>> {
  try {
    const res = await pool.query(
      `SELECT value FROM system_config WHERE key = $1`,
      [BLOCKED_KEY],
    );
    if (!res.rows[0]) return new Set();
    return new Set(JSON.parse(res.rows[0].value) as string[]);
  } catch {
    return new Set();
  }
}

async function saveBlockedSet(set: Set<string>): Promise<void> {
  const arr = Array.from(set);
  await pool.query(
    `INSERT INTO system_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [BLOCKED_KEY, JSON.stringify(arr)],
  );
}

export async function isUserBlocked(username: string): Promise<boolean> {
  const set = await getBlockedSet();
  return set.has(username.toLowerCase());
}

export async function blockUser(username: string): Promise<void> {
  const set = await getBlockedSet();
  set.add(username.toLowerCase());
  await saveBlockedSet(set);
}

export async function unblockUser(username: string): Promise<void> {
  const set = await getBlockedSet();
  set.delete(username.toLowerCase());
  await saveBlockedSet(set);
}

export async function getBlockedUsers(): Promise<string[]> {
  const set = await getBlockedSet();
  return Array.from(set).sort();
}

// ─── User Removal (blocks + revokes + clears history) ────────────────────────

export async function removeUser(username: string): Promise<{ sessions: number }> {
  const [sessions] = await Promise.all([
    revokeAllSessionsForUser(username),
    blockUser(username),
    removeUserSessions(username),
    // Wipe conversation history attributed to this user ID
    pool
      .query(
        `DELETE FROM conversations WHERE user_id = $1`,
        [crypto.createHash("sha256").update(username).digest("hex").slice(0, 16)],
      )
      .catch(() => {}),
  ]);
  return { sessions };
}

export { getIp };
