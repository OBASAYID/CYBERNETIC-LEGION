import { Router } from "express";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { requireAdmin } from "../security/middleware.js";
import { trainingService } from "../intelligence/training-service.js";
import { memoryService } from "../intelligence/memory-service.js";
import { storeMemory } from "../services/memoryService.js";

const router = Router();

const trainingSchema = z.object({
  sourceType: z.enum(["dataset", "document", "mission_replay", "interaction_batch"]),
  items: z.array(z.object({
    content: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1),
});

const trainingFileSchema = z.object({
  filePath: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

router.use(requireAdmin);

router.post("/", async (req: any, res) => {
  const parsedFile = trainingFileSchema.safeParse(req.body);
  if (parsedFile.success) {
    try {
      const resolvedPath = parsedFile.data.filePath;
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: "Training file not found" });
      }

      const fileBuffer = fs.readFileSync(resolvedPath);
      const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
      const extracted = await parser.getText();
      const text = extracted.text?.trim();

      if (!text) {
        return res.status(400).json({ error: "No extractable text found in PDF" });
      }

      await storeMemory(text, {
        source: "training",
        filePath: resolvedPath,
        ...(parsedFile.data.metadata ?? {}),
      });

      return res.status(201).json({ status: "trained", source: "pdf", filePath: resolvedPath });
    } catch (error) {
      return res.status(500).json({ error: "PDF training failed", details: error instanceof Error ? error.message : String(error) });
    }
  }

  const parsed = trainingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid training payload", details: parsed.error.flatten() });
  }

  const run = await trainingService.train({
    initiatedBy: req.session?.user?.id ?? req.user?.claims?.sub ?? null,
    sourceType: parsed.data.sourceType,
    items: parsed.data.items,
  });

  await memoryService.recordMissionLog({
    missionId: run.id,
    userId: req.session?.user?.id ?? req.user?.claims?.sub ?? null,
    status: run.status,
    summary: run.summary || `Training run ${run.id}`,
    details: run.metadata as Record<string, unknown> | null,
  });

  res.status(201).json({ run });
});

router.post("/recall", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  const results = await memoryService.recall(query, Number(req.body?.limit ?? 5));
  res.json({ results });
});

export default router;