import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../security/middleware.js";
import { apiKeyService } from "../services/api-key-service.js";

const router = Router();

const keySchema = z.object({
  provider: z.string().min(1),
  keyName: z.string().min(1),
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

export default router;