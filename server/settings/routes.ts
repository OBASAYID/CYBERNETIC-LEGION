import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../security/middleware.js";
import { apiKeyService } from "../services/api-key-service.js";
import { getAccessCodeStatus, setAccessCodes } from "../auth/access-code-store.js";
import {
  getActivityLog,
  getActiveSessions,
  revokeSessionByHash,
  revokeAllSessionsForUser,
  blockUser,
  unblockUser,
  getBlockedUsers,
  removeUser,
  logActivity,
} from "../auth/auth-activity.js";

const router = Router();

const keySchema = z.object({
  provider: z.string().min(1),
  keyName: z.string().min(1),
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const accessCodeSchema = z
  .object({
    adminCode: z.string().min(4).max(64).optional(),
    userCode: z.string().min(4).max(64).optional(),
  })
  .refine((d) => d.adminCode !== undefined || d.userCode !== undefined, {
    message: "At least one of adminCode or userCode must be provided",
  });

router.use(requireAdmin);

// ─── API Keys ──────────────────────────────────────────────────────────────

router.get("/keys", async (_req, res) => {
  const keys = await apiKeyService.listKeys();
  res.json({ keys });
});

router.post("/keys", async (req: any, res) => {
  const parsed = keySchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid key payload", details: parsed.error.flatten() });

  const created = await apiKeyService.upsertKey({
    ...parsed.data,
    createdBy: req.session?.user?.id ?? req.user?.claims?.sub ?? null,
  });
  res.status(201).json({ id: created.id, provider: created.provider, keyName: created.keyName, updatedAt: created.updatedAt });
});

router.delete("/keys/:provider/:keyName", async (req, res) => {
  await apiKeyService.deleteKey(req.params.provider, req.params.keyName);
  res.status(204).send();
});

// ─── Access Codes ─────────────────────────────────────────────────────────

router.get("/access-codes", async (_req, res) => {
  try {
    res.json(await getAccessCodeStatus());
  } catch (err) {
    console.error("[Settings] Failed to get access code status:", err);
    res.status(500).json({ error: "Failed to retrieve access code status" });
  }
});

router.post("/access-codes", async (req, res) => {
  const parsed = accessCodeSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    await setAccessCodes(parsed.data);
    res.json({ success: true, ...(await getAccessCodeStatus()) });
  } catch (err) {
    console.error("[Settings] Failed to update access codes:", err);
    res.status(500).json({ error: "Failed to update access codes" });
  }
});

// ─── Activity Log ─────────────────────────────────────────────────────────

router.get("/activity-log", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    res.json({ entries: await getActivityLog(limit) });
  } catch (err) {
    console.error("[Settings] Failed to get activity log:", err);
    res.status(500).json({ error: "Failed to retrieve activity log" });
  }
});

// ─── Sessions ─────────────────────────────────────────────────────────────

router.get("/sessions", async (_req, res) => {
  try {
    res.json({ sessions: await getActiveSessions() });
  } catch (err) {
    console.error("[Settings] Failed to get sessions:", err);
    res.status(500).json({ error: "Failed to retrieve sessions" });
  }
});

router.delete("/sessions/:tokenHash", async (req: any, res) => {
  try {
    const adminUser = req.user?.username ?? req.session?.user?.username ?? "admin";
    await revokeSessionByHash(req.params.tokenHash);
    void logActivity({ username: adminUser, eventType: "session_revoked", details: `Token ${req.params.tokenHash.slice(0, 8)}…` });
    res.json({ success: true });
  } catch (err) {
    console.error("[Settings] Failed to revoke session:", err);
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

// ─── User Management ───────────────────────────────────────────────────────

router.get("/blocked-users", async (_req, res) => {
  try {
    res.json({ blocked: await getBlockedUsers() });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve blocked users" });
  }
});

router.post("/users/:username/block", async (req: any, res) => {
  try {
    const { username } = req.params;
    const adminUser = req.user?.username ?? req.session?.user?.username ?? "admin";
    await Promise.all([blockUser(username), revokeAllSessionsForUser(username)]);
    void logActivity({ username: adminUser, eventType: "user_blocked", details: `Blocked: ${username}` });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to block user" });
  }
});

router.post("/users/:username/unblock", async (req: any, res) => {
  try {
    const { username } = req.params;
    const adminUser = req.user?.username ?? req.session?.user?.username ?? "admin";
    await unblockUser(username);
    void logActivity({ username: adminUser, eventType: "user_unblocked", details: `Unblocked: ${username}` });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

router.post("/users/:username/logout", async (req: any, res) => {
  try {
    const { username } = req.params;
    const adminUser = req.user?.username ?? req.session?.user?.username ?? "admin";
    const count = await revokeAllSessionsForUser(username);
    void logActivity({ username: adminUser, eventType: "session_revoked", details: `Force-logout: ${username} (${count} sessions)` });
    res.json({ success: true, sessionsRevoked: count });
  } catch (err) {
    res.status(500).json({ error: "Failed to logout user" });
  }
});

router.delete("/users/:username", async (req: any, res) => {
  try {
    const { username } = req.params;
    const adminUser = req.user?.username ?? req.session?.user?.username ?? "admin";
    const result = await removeUser(username);
    void logActivity({ username: adminUser, eventType: "user_removed", details: `Removed: ${username} (${result.sessions} sessions revoked)` });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove user" });
  }
});

export default router;
