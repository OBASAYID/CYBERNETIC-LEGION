/**
 * Unified asset ingestion service — shared by REST routes and MCP tools.
 */

import { getAssetStats, loadAssetRegistry, searchAssets } from "./asset-registry.js";
import { downloadAndRegisterAsset } from "./asset-downloader.js";
import { getFailedDownloadStats } from "./download-failures.js";
import { runAssetMining, ingestUrls, resumeFailedDownloads } from "./asset-miner.js";
import { resolveWebAssets } from "./asset-resolver.js";
import {
  clusterDomains,
  expandMiningQueries,
  getMlMiningStatus,
  mineTagVocabulary,
  syncAssetToKnowledge,
} from "./asset-ml-engine.js";
import { loadAssetModel } from "./asset-model.js";
import { trainAssetModel } from "./asset-trainer.js";
import type { AssetDomain } from "../../shared/asset-types.js";

let mineRunning = false;
let resumeRunning = false;
let trainRunning = false;

export function getIngestStatus() {
  return {
    openAiIndependent: process.env.CYRUS_OPENAI_INDEPENDENT === "true" || process.env.CYRUS_NO_OPENAI === "true",
    failedDownloads: getFailedDownloadStats(),
    ml: getMlMiningStatus(),
    model: loadAssetModel()
      ? {
          algorithmVersion: loadAssetModel()?.algorithmVersion,
          metrics: loadAssetModel()?.metrics,
        }
      : null,
    jobs: { mineRunning, resumeRunning, trainRunning },
    ...getAssetStats(),
  };
}

export async function ingestAssetUrl(input: {
  url: string;
  title?: string;
  domain?: AssetDomain;
  tags?: string[];
  license?: string;
  attribution?: string;
}) {
  const record = await downloadAndRegisterAsset(input);
  if (record && process.env.CYRUS_ML_KNOWLEDGE_SYNC !== "false") {
    await syncAssetToKnowledge({
      title: record.title,
      domain: record.domain,
      tags: record.tags,
      sourceUrl: record.sourceUrl,
      license: record.license,
    });
  }
  return record;
}

export async function ingestAssetUrls(urls: string[], domain?: AssetDomain) {
  return ingestUrls(urls, domain);
}

export async function searchIngestAssets(input: {
  query: string;
  kind?: "image" | "model_3d";
  domain?: AssetDomain;
  limit?: number;
  fetchIfMissing?: boolean;
}) {
  const limit = input.limit ?? 12;
  if (input.fetchIfMissing !== false) {
    return resolveWebAssets({
      query: input.query,
      kind: input.kind,
      domain: input.domain,
      limit,
    });
  }
  return searchAssets(input.query, { kind: input.kind, domain: input.domain, limit }).map((r) => r.asset);
}

export async function resumeIngestFailures() {
  if (resumeRunning) throw new Error("Resume already in progress");
  resumeRunning = true;
  try {
    const result = await resumeFailedDownloads();
    return { ...result, total: getAssetStats().total };
  } finally {
    resumeRunning = false;
  }
}

export async function startIngestMining(input: { target?: number; useMl?: boolean; wait?: boolean }) {
  if (mineRunning) throw new Error("Mining already in progress");
  const target = Math.min(5_000_000, Math.max(100, input.target ?? 10_000));
  mineRunning = true;

  const run = () =>
    runAssetMining({ target, useMl: input.useMl !== false })
      .then((result) => {
        console.log("[Assets] Mine complete:", result);
        return result;
      })
      .finally(() => {
        mineRunning = false;
      });

  if (input.wait) return run();
  run().catch((err) => console.error("[Assets] Mine failed:", err));
  return { started: true, target, message: `Mining toward ${target.toLocaleString()} assets` };
}

export async function startMlTraining(input: { simulations?: number; wait?: boolean }) {
  if (trainRunning) throw new Error("ML training already in progress");
  const simulations = Math.min(2_000_000, Math.max(1000, input.simulations ?? 50_000));
  trainRunning = true;

  const run = () =>
    trainAssetModel({ simulations })
      .then((model) => {
        console.log("[AssetML] Training complete:", model.metrics);
        return model;
      })
      .finally(() => {
        trainRunning = false;
      });

  if (input.wait) return run();
  run().catch((err) => console.error("[AssetML] Training failed:", err));
  return { started: true, simulations, message: `Training ${simulations.toLocaleString()} simulations` };
}

export function getDataMiningInsights() {
  return {
    tagVocabulary: mineTagVocabulary(30),
    domainClusters: clusterDomains(8),
    expandedQueries: expandMiningQueries(25).map((q) => ({
      query: q.query,
      domain: q.domain,
      tags: q.tags,
    })),
    registrySample: loadAssetRegistry().slice(-5),
  };
}

export function getCatalog(limit = 100) {
  return {
    assets: loadAssetRegistry().slice(-Math.min(500, limit)),
    stats: getAssetStats(),
  };
}
