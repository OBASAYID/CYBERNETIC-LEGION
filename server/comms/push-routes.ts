import { Router } from "express";
import {
  listPushDevices,
  pushCallServiceConfigured,
  registerPushDevice,
  type PushPlatform,
} from "./push-call-service.js";

const router = Router();

router.get("/api/comms/push/status", (_req, res) => {
  res.json({
    configured: pushCallServiceConfigured(),
    redis: Boolean(String(process.env.REDIS_URL || "").trim()),
  });
});

router.post("/api/comms/push/register", async (req, res) => {
  try {
    const sessionUserId = (req as { session?: { user?: { id?: string } } }).session?.user?.id;
    const userId = String(req.body?.userId || sessionUserId || "").trim();
    const deviceId = String(req.body?.deviceId || "").trim();
    const token = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "fcm").trim() as PushPlatform;
    if (!userId || !deviceId || !token) {
      res.status(400).json({ ok: false, error: "userId, deviceId, and token are required" });
      return;
    }
    await registerPushDevice({
      userId,
      deviceId,
      platform: platform === "apns" || platform === "web" ? platform : "fcm",
      token,
      updatedAt: Date.now(),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/api/comms/push/devices", async (req, res) => {
  const sessionUserId = (req as { session?: { user?: { id?: string } } }).session?.user?.id;
  const userId = String(req.query?.userId || sessionUserId || "").trim();
  if (!userId) {
    res.status(400).json({ ok: false, error: "userId required" });
    return;
  }
  const devices = await listPushDevices(userId);
  res.json({
    ok: true,
    count: devices.length,
    devices: devices.map((d) => ({
      deviceId: d.deviceId,
      platform: d.platform,
      updatedAt: d.updatedAt,
    })),
  });
});

export { router as pushCallRouter };
