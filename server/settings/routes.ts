import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../security/middleware.js";
import { apiKeyService } from "../services/api-key-service.js";
import { getAccessCodeStatus, setAccessCodes } from "../auth/access-code-store.js";

const router = Router();

const keySchema = z.object({
  provider: z.string().min(1),
  keyName: z.string().min(1),
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const accessCodeSchema = z.object({
  adminCode: z.string().min(4).max(64).optional(),
  userCode: z.string().min(4).max(64).optional(),
}).refine((d) => d.adminCode !== undefined || d.userCode !== undefined, {
  message: "At least one of adminCode or userCode must be provided",
});

router.use(requireAdmin);

router.get("/keys", async (_req, res) => {
  const keys = await apiKeyService.listKeys();
  res.json({ keys });
});

router.post("/keys", async (req: any, res) => {
  const parsed = keySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid key payload", details: parsed.error.flatten() });
  }

  const created = await apiKeyService.upsertKey({
    ...parsed.data,
    createdBy: req.session?.user?.id ?? req.user?.claims?.sub ?? null,
  });

  res.status(201).json({
    id: created.id,
    provider: created.provider,
    keyName: created.keyName,
    updatedAt: created.updatedAt,
  });
});

router.delete("/keys/:provider/:keyName", async (req, res) => {
  await apiKeyService.deleteKey(req.params.provider, req.params.keyName);
  res.status(204).send();
});

router.get("/access-codes", async (_req, res) => {
  try {
    const status = await getAccessCodeStatus();
    res.json(status);
  } catch (err) {
    console.error("[Settings] Failed to get access code status:", err);
    res.status(500).json({ error: "Failed to retrieve access code status" });
  }
});

router.post("/access-codes", async (req, res) => {
  const parsed = accessCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    await setAccessCodes(parsed.data);
    const status = await getAccessCodeStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    console.error("[Settings] Failed to update access codes:", err);
    res.status(500).json({ error: "Failed to update access codes" });
  }
});

export default router;
