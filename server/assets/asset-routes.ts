import { Router } from "express";
import path from "path";
import fs from "fs";
import { ASSET_FILES_DIR, getAssetFilePath } from "./asset-registry.js";
import {
  getCatalog,
  getDataMiningInsights,
  getIngestStatus,
  ingestAssetUrl,
  ingestAssetUrls,
  resumeIngestFailures,
  searchIngestAssets,
  startIngestMining,
  startMlTraining,
} from "./asset-ingest-service.js";
import type { AssetDomain } from "../../shared/asset-types.js";

const router = Router();

router.get("/api/assets/stats", (_req, res) => {
  res.json(getIngestStatus());
});

router.get("/api/assets/ml/status", (_req, res) => {
  res.json(getIngestStatus().ml);
});

router.get("/api/assets/data-mining", (_req, res) => {
  res.json(getDataMiningInsights());
});

router.post("/api/assets/train", async (req, res) => {
  try {
    const result = await startMlTraining({
      simulations: parseInt(String(req.body?.simulations || "50000"), 10) || 50_000,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err instanceof Error && err.message.includes("already") ? 409 : 500).json({
      error: err instanceof Error ? err.message : "Train failed",
    });
  }
});

router.get("/api/assets/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "q is required" });
  const results = await searchIngestAssets({
    query: q,
    kind: req.query.kind as "image" | "model_3d" | undefined,
    domain: req.query.domain as AssetDomain | undefined,
    limit: parseInt(String(req.query.limit || "12"), 10),
    fetchIfMissing: req.query.fetch !== "0",
  });
  res.json({ query: q, count: results.length, results });
});

router.get("/api/assets/file/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const full = getAssetFilePath(filename);
  if (!full.startsWith(ASSET_FILES_DIR) || !fs.existsSync(full)) {
    return res.status(404).json({ error: "Asset not found" });
  }
  res.sendFile(full);
});

router.post("/api/assets/ingest/url", async (req, res) => {
  const url = String(req.body?.url || "").trim();
  if (!url) return res.status(400).json({ error: "url is required" });
  const record = await ingestAssetUrl({
    url,
    title: req.body?.title,
    domain: req.body?.domain,
    tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
    license: req.body?.license,
    attribution: req.body?.attribution,
  });
  if (!record) return res.status(422).json({ error: "Failed to ingest URL" });
  res.json({ success: true, asset: record });
});

router.post("/api/assets/ingest/urls", async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls.map(String) : [];
  if (!urls.length) return res.status(400).json({ error: "urls array required" });
  const count = await ingestAssetUrls(urls, req.body?.domain);
  res.json({ success: true, ingested: count, total: getIngestStatus().total });
});

router.post("/api/assets/resume", async (_req, res) => {
  try {
    const result = await resumeIngestFailures();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err instanceof Error && err.message.includes("already") ? 409 : 500).json({
      error: err instanceof Error ? err.message : "Resume failed",
    });
  }
});

router.post("/api/assets/mine", async (req, res) => {
  try {
    const target = parseInt(String(req.body?.target || "10000"), 10) || 10_000;
    const result = await startIngestMining({ target, useMl: req.body?.ml !== false });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err instanceof Error && err.message.includes("already") ? 409 : 500).json({
      error: err instanceof Error ? err.message : "Mine failed",
    });
  }
});

router.get("/api/assets/catalog", (req, res) => {
  const limit = parseInt(String(req.query.limit || "100"), 10) || 100;
  res.json(getCatalog(limit));
});

export { router as assetRouter };
