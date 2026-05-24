/**
 * Bulk web asset mining — Wikimedia, DuckDuckGo pages, seed catalog.
 * Checkpointed for large runs (target millions of registry entries over time).
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { ASSET_ROOT, getAssetStats, loadAssetRegistry } from "./asset-registry.js";
import {
  downloadAndRegisterAsset,
  extractAssetUrlsFromHtml,
  isLowValueAssetUrl,
  searchWebPageUrls,
  searchWikimediaImages,
} from "./asset-downloader.js";
import { getFailedDownloadStats, loadFailedDownloads, markDownloadResolved } from "./download-failures.js";
import {
  expandMiningQueries,
  isMlMiningEnabled,
  rankCandidateUrls,
  syncAssetToKnowledge,
} from "./asset-ml-engine.js";
import { ASSET_SEED_QUERIES, OPEN_MODEL_URLS } from "./seed-catalog.js";
import type { AssetDomain } from "../../shared/asset-types.js";

export type MineProgress = {
  ingested: number;
  skipped: number;
  failed: number;
  target: number;
  queriesProcessed: number;
};

const CHECKPOINT_PATH = path.join(ASSET_ROOT, "mine-checkpoint.json");

function loadCheckpoint(): { queryIndex: number; ingested: number } {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
    }
  } catch { /* fresh */ }
  return { queryIndex: 0, ingested: 0 };
}

function saveCheckpoint(queryIndex: number, ingested: number): void {
  if (!fs.existsSync(ASSET_ROOT)) fs.mkdirSync(ASSET_ROOT, { recursive: true });
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({ queryIndex, ingested, at: new Date().toISOString() }));
}

function existingSourceUrls(): Set<string> {
  return new Set(loadAssetRegistry().map((r) => r.sourceUrl));
}

function basenameFromUrl(url: string): string {
  try {
    return path.basename(new URL(url).pathname);
  } catch {
    return url;
  }
}

function alternateMirrorAlreadyInRegistry(url: string): boolean {
  const base = basenameFromUrl(url);
  if (!base) return false;
  return loadAssetRegistry().some((r) => basenameFromUrl(r.sourceUrl) === base);
}

export async function mineAssetsForQuery(
  query: string,
  domain: AssetDomain,
  tags: string[],
  options: { maxPerQuery?: number; preferWikimedia?: boolean } = {},
): Promise<{ ingested: number; failed: number }> {
  const max = options.maxPerQuery ?? 12;
  const seen = existingSourceUrls();
  let ingested = 0;
  let failed = 0;

  const wikimedia = options.preferWikimedia !== false ? await searchWikimediaImages(query, max) : [];
  const pageUrls = await searchWebPageUrls(`${query} diagram OR illustration`, Math.min(6, max));

  const candidateUrls: string[] = [...wikimedia];

  for (const pageUrl of pageUrls) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data: html } = await axios.get(pageUrl, {
          timeout: 20_000 + attempt * 10_000,
          headers: { "User-Agent": "CYRUS-Asset-Ingest/1.1" },
        });
        const extracted = extractAssetUrlsFromHtml(String(html), pageUrl);
        candidateUrls.push(...extracted.images.slice(0, 4), ...extracted.models.slice(0, 2));
        break;
      } catch {
        if (attempt === 2) failed += 1;
      }
    }
  }

  const unique = [...new Set(candidateUrls)];
  const prioritized = isMlMiningEnabled()
    ? rankCandidateUrls(unique, query, domain, tags, 40)
    : unique;

  for (const url of prioritized.slice(0, max)) {
    if (seen.has(url)) continue;
    seen.add(url);
    const record = await downloadAndRegisterAsset({
      url,
      title: query,
      domain,
      tags,
      license: wikimedia.includes(url) ? "Wikimedia Commons" : undefined,
      attribution: wikimedia.includes(url) ? "Wikimedia Commons" : undefined,
    });
    if (record) {
      ingested += 1;
      if (isMlMiningEnabled()) {
        await syncAssetToKnowledge({
          title: record.title,
          domain: record.domain,
          tags: record.tags,
          sourceUrl: record.sourceUrl,
          license: record.license,
        });
      }
    } else failed += 1;
  }

  return { ingested, failed };
}

async function downloadModelWithMirrors(model: (typeof OPEN_MODEL_URLS)[number]): Promise<boolean> {
  const urls = [model.url, ...(model.mirrors || [])];
  for (const url of urls) {
    const r = await downloadAndRegisterAsset({
      url,
      title: model.title,
      domain: model.domain,
      tags: ["3d", "bootstrap"],
      license: model.license || "Khronos glTF Sample Models",
    });
    if (r) return true;
  }
  return false;
}

export async function resumeFailedDownloads(): Promise<{ recovered: number; stillFailed: number; pending: number }> {
  const pending = loadFailedDownloads(false);
  let recovered = 0;
  let stillFailed = 0;

  console.log(`[Assets] Resuming ${pending.length} failed download(s)…`);

  for (const entry of pending) {
    if (isLowValueAssetUrl(entry.url) || alternateMirrorAlreadyInRegistry(entry.url)) {
      markDownloadResolved(entry.url);
      continue;
    }
    const record = await downloadAndRegisterAsset({
      url: entry.url,
      title: entry.title,
      domain: entry.domain,
      tags: entry.tags,
      license: entry.license,
      attribution: entry.attribution,
    });
    if (record) recovered += 1;
    else stillFailed += 1;
  }

  return { recovered, stillFailed, pending: pending.length };
}

export async function runAssetMining(options: {
  target?: number;
  startFromCheckpoint?: boolean;
  resumeFailures?: boolean;
  useMl?: boolean;
  onProgress?: (p: MineProgress) => void;
}): Promise<MineProgress> {
  const ml = options.useMl !== false && isMlMiningEnabled();
  if (ml) console.log("[AssetML] ML-guided mining active (ridge scoring + tag mining + knowledge sync)");

  const target = Math.max(100, options.target ?? 10_000);
  const cp = options.startFromCheckpoint !== false ? loadCheckpoint() : { queryIndex: 0, ingested: 0 };

  if (options.resumeFailures !== false) {
    const resume = await resumeFailedDownloads();
    if (resume.pending > 0) {
      console.log(`[Assets] Resume: recovered=${resume.recovered} stillFailed=${resume.stillFailed}`);
    }
  }

  let ingested = Math.max(cp.ingested, getAssetStats().total);
  let skipped = 0;
  let failed = 0;
  let queriesProcessed = 0;
  let stalePasses = 0;

  // Bootstrap open 3D models once
  const seen = existingSourceUrls();
  for (const model of OPEN_MODEL_URLS) {
    if (getAssetStats().total >= target) break;
    if (seen.has(model.url) || (model.mirrors || []).some((m) => seen.has(m))) {
      skipped += 1;
      continue;
    }
    const ok = await downloadModelWithMirrors(model);
    if (ok) ingested += 1;
    else failed += 1;
  }

  const seeds = ml ? expandMiningQueries(30) : ASSET_SEED_QUERIES;
  let qi = cp.queryIndex % seeds.length;

  while (getAssetStats().total < target) {
    const seed = seeds[qi];
    const beforeTotal = getAssetStats().total;
    const result = await mineAssetsForQuery(seed.query, seed.domain, seed.tags, {
      preferWikimedia: seed.preferWikimedia,
    });
    ingested = getAssetStats().total;
    failed += result.failed;
    queriesProcessed += 1;
    qi = (qi + 1) % seeds.length;

    if (getAssetStats().total === beforeTotal) {
      skipped += 1;
      stalePasses += 1;
    } else {
      stalePasses = 0;
    }

    saveCheckpoint(qi, ingested);
    options.onProgress?.({
      ingested,
      skipped,
      failed,
      target,
      queriesProcessed,
    });

    if (stalePasses >= seeds.length * 2) break;
  }

  if (options.resumeFailures !== false && getFailedDownloadStats().pending > 0) {
    const finalResume = await resumeFailedDownloads();
    ingested = Math.max(ingested, getAssetStats().total);
    console.log(`[Assets] Final resume pass: recovered=${finalResume.recovered} stillFailed=${finalResume.stillFailed}`);
  }

  return { ingested, skipped, failed, target, queriesProcessed };
}

export async function ingestUrls(urls: string[], domain?: AssetDomain): Promise<number> {
  let count = 0;
  const seen = existingSourceUrls();
  for (const url of urls) {
    if (seen.has(url)) continue;
    const r = await downloadAndRegisterAsset({ url, domain });
    if (r) count += 1;
  }
  return count;
}
