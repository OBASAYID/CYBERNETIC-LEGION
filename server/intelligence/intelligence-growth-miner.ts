/**
 * CYRUS Intelligence Growth — mine open online knowledge + assets, ingest into brain/KB.
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import {
  INTELLIGENCE_ASSET_QUERIES,
  KNOWLEDGE_TOPICS,
  WEB_KNOWLEDGE_SOURCES,
} from "./knowledge-seed-catalog.js";
import { getAssetStats } from "../assets/asset-registry.js";
import { mineAssetsForQuery, resumeFailedDownloads, runAssetMining } from "../assets/asset-miner.js";
import { expandMiningQueries } from "../assets/asset-ml-engine.js";
import { ASSET_SEED_QUERIES } from "../assets/seed-catalog.js";
import type { AssetDomain } from "../../shared/asset-types.js";

const GROWTH_ROOT = path.join(process.cwd(), "data", "intelligence");
const CHECKPOINT_PATH = path.join(GROWTH_ROOT, "growth-checkpoint.json");
const STATS_PATH = path.join(GROWTH_ROOT, "growth-stats.json");

export type GrowthProgress = {
  knowledgeIngested: number;
  knowledgeSkipped: number;
  knowledgeFailed: number;
  assetsBefore: number;
  assetsAfter: number;
  topicsProcessed: number;
  webPagesProcessed: number;
  assetQueriesProcessed: number;
};

export type GrowthRunResult = {
  success: boolean;
  startedAt: string;
  completedAt: string;
  progress: GrowthProgress;
  knowledgeBaseEntries: number;
};

let growthRunning = false;
let lastGrowth: GrowthRunResult | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function loadCheckpoint(): { topicIndex: number; webIndex: number; assetQueryIndex: number } {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
    }
  } catch { /* fresh run */ }
  return { topicIndex: 0, webIndex: 0, assetQueryIndex: 0 };
}

function saveCheckpoint(cp: { topicIndex: number; webIndex: number; assetQueryIndex: number }): void {
  fs.mkdirSync(GROWTH_ROOT, { recursive: true });
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function saveStats(result: GrowthRunResult): void {
  fs.mkdirSync(GROWTH_ROOT, { recursive: true });
  fs.writeFileSync(STATS_PATH, JSON.stringify(result, null, 2));
}

async function syncTextToIntelligenceStack(input: {
  title: string;
  content: string;
  source: string;
  category: string;
  domain: AssetDomain;
  tags: string[];
}): Promise<boolean> {
  if (!input.content.trim()) return false;

  let kbOk = false;
  try {
    const { KnowledgeBase } = await import("../data-collection/knowledge-base.js");
    const kb = new KnowledgeBase();
    await kb.initialize();
    await kb.addEntry({
      content: input.content,
      metadata: { title: input.title, url: input.source, domain: input.domain },
      source: input.source,
      category: input.category,
      tags: input.tags,
    });
    kbOk = true;
  } catch (err) {
    console.warn("[Growth] Knowledge base write failed:", err instanceof Error ? err.message : err);
  }

  if (process.env.CYRUS_ML_KNOWLEDGE_SYNC !== "false") {
    const snippet = `${input.title}: ${input.content.slice(0, 4000)}`;
    try {
      const { cyrusBrain } = await import("../ai/cyrus-brain.js");
      await cyrusBrain.addKnowledge(snippet, {
        sourceType: "dataset",
        domain: input.domain,
        sourceUrl: input.source,
        category: input.category,
      });
    } catch (err) {
      console.warn("[Growth] Brain sync skipped:", err instanceof Error ? err.message : err);
    }
    try {
      const { learningSystem } = await import("../ai/learning-system.js");
      await learningSystem.learnFromDocument(snippet, {
        domain: input.domain,
        tags: input.tags,
        sourceUrl: input.source,
      });
    } catch (err) {
      console.warn("[Growth] Learning system sync skipped:", err instanceof Error ? err.message : err);
    }
  }

  return kbOk;
}

export async function fetchWikipediaSummary(pageTitle: string): Promise<{
  title: string;
  extract: string;
  url: string;
} | null> {
  const encoded = encodeURIComponent(pageTitle.replace(/ /g, "_"));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
        {
          timeout: 20_000,
          headers: { "User-Agent": "CYRUS-Intelligence-Growth/1.0 (research; open-data)" },
        },
      );
      const extract = String(data.extract || data.description || "").trim();
      if (!extract) return null;
      return {
        title: String(data.title || pageTitle),
        extract,
        url: String(data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encoded}`),
      };
    } catch {
      await sleep(400 * (attempt + 1));
    }
  }
  return null;
}

async function ingestWikipediaTopics(
  startIndex: number,
  limit: number,
  progress: GrowthProgress,
): Promise<number> {
  const topics = KNOWLEDGE_TOPICS.slice(startIndex, startIndex + limit);
  let nextIndex = startIndex;

  for (const topic of topics) {
    nextIndex += 1;
    const page = topic.wikipedia || topic.title;
    const summary = await fetchWikipediaSummary(page);
    if (!summary) {
      progress.knowledgeFailed += 1;
      await sleep(200);
      continue;
    }

    const ok = await syncTextToIntelligenceStack({
      title: summary.title,
      content: summary.extract,
      source: summary.url,
      category: topic.category,
      domain: topic.domain,
      tags: [...topic.tags, "wikipedia", topic.category],
    });

    if (ok) {
      progress.knowledgeIngested += 1;
      progress.topicsProcessed += 1;
    } else {
      progress.knowledgeSkipped += 1;
    }
    await sleep(250);
  }

  return nextIndex;
}

async function ingestWebSources(
  startIndex: number,
  limit: number,
  progress: GrowthProgress,
): Promise<number> {
  const sources = WEB_KNOWLEDGE_SOURCES.slice(startIndex, startIndex + limit);
  let nextIndex = startIndex;
  const { WebScraper } = await import("../data-collection/web-scraper.js");
  const scraper = new WebScraper();

  for (const src of sources) {
    nextIndex += 1;
    const result = await scraper.scrapeUrl(src.url);
    if (!result.success || !result.data?.content) {
      progress.knowledgeFailed += 1;
      continue;
    }

    const ok = await syncTextToIntelligenceStack({
      title: src.title,
      content: result.data.content.slice(0, 12_000),
      source: src.url,
      category: src.category,
      domain: src.domain,
      tags: [...src.tags, "web-scrape"],
    });

    if (ok) {
      progress.knowledgeIngested += 1;
      progress.webPagesProcessed += 1;
    } else {
      progress.knowledgeSkipped += 1;
    }
    await sleep(500);
  }

  return nextIndex;
}

async function mineIntelligenceAssets(
  assetTarget: number,
  progress: GrowthProgress,
  onProgress?: (p: GrowthProgress) => void,
): Promise<void> {
  const ml = process.env.CYRUS_ML_ASSETS !== "false";
  const baseSeeds = [...ASSET_SEED_QUERIES, ...INTELLIGENCE_ASSET_QUERIES];
  const expanded = ml ? expandMiningQueries(80) : baseSeeds;
  const seeds = [...baseSeeds, ...expanded.filter((e) => !baseSeeds.some((b) => b.query === e.query))];

  let qi = 0;
  while (getAssetStats().total < assetTarget && qi < seeds.length * 3) {
    const seed = seeds[qi % seeds.length];
    await mineAssetsForQuery(seed.query, seed.domain, seed.tags, {
      preferWikimedia: seed.preferWikimedia,
      maxPerQuery: 14,
    });
    progress.assetQueriesProcessed += 1;
    progress.assetsAfter = getAssetStats().total;
    qi += 1;
    onProgress?.(progress);
    if (qi % 10 === 0) saveCheckpoint({ topicIndex: 0, webIndex: 0, assetQueryIndex: qi });
  }
}

export function getGrowthStatus() {
  let kbEntries = 0;
  try {
    const statsPath = path.join(process.cwd(), "data", "knowledge");
    if (fs.existsSync(statsPath)) {
      kbEntries = fs.readdirSync(statsPath).filter((f) => f.endsWith(".json")).length;
    }
  } catch { /* ignore */ }

  return {
    growthRunning,
    lastGrowth,
    checkpoint: loadCheckpoint(),
    catalog: {
      wikipediaTopics: KNOWLEDGE_TOPICS.length,
      webSources: WEB_KNOWLEDGE_SOURCES.length,
      intelligenceAssetQueries: INTELLIGENCE_ASSET_QUERIES.length,
    },
    assets: getAssetStats(),
    knowledgeBaseEntries: kbEntries,
  };
}

export async function runIntelligenceGrowth(options: {
  assetTarget?: number;
  wikipediaBatch?: number;
  webBatch?: number;
  resumeAssets?: boolean;
  fullAssetMining?: boolean;
  onProgress?: (p: GrowthProgress) => void;
} = {}): Promise<GrowthRunResult> {
  if (growthRunning) throw new Error("Intelligence growth already running");
  growthRunning = true;

  const startedAt = new Date().toISOString();
  const cp = loadCheckpoint();
  const assetsBefore = getAssetStats().total;
  const assetTarget = Math.max(assetsBefore + 50, options.assetTarget ?? assetsBefore + 500);

  const progress: GrowthProgress = {
    knowledgeIngested: 0,
    knowledgeSkipped: 0,
    knowledgeFailed: 0,
    assetsBefore,
    assetsAfter: assetsBefore,
    topicsProcessed: 0,
    webPagesProcessed: 0,
    assetQueriesProcessed: 0,
  };

  try {
    console.log("[Growth] Phase 1 — Wikipedia knowledge ingestion");
    const wikiBatch = options.wikipediaBatch ?? KNOWLEDGE_TOPICS.length;
    const nextTopic = await ingestWikipediaTopics(cp.topicIndex, wikiBatch, progress);
    cp.topicIndex = nextTopic >= KNOWLEDGE_TOPICS.length ? 0 : nextTopic;
    options.onProgress?.(progress);

    console.log("[Growth] Phase 2 — Web source scraping + knowledge sync");
    const webBatch = options.webBatch ?? WEB_KNOWLEDGE_SOURCES.length;
    const nextWeb = await ingestWebSources(cp.webIndex, webBatch, progress);
    cp.webIndex = nextWeb >= WEB_KNOWLEDGE_SOURCES.length ? 0 : nextWeb;
    options.onProgress?.(progress);

    if (options.resumeAssets !== false) {
      console.log("[Growth] Phase 3 — Resume failed asset downloads");
      await resumeFailedDownloads();
    }

    console.log(`[Growth] Phase 4 — Asset mining toward ${assetTarget.toLocaleString()}`);
    if (options.fullAssetMining) {
      await runAssetMining({
        target: assetTarget,
        useMl: true,
        resumeFailures: true,
        onProgress: (p) => {
          progress.assetsAfter = p.ingested;
          options.onProgress?.(progress);
        },
      });
    } else {
      await mineIntelligenceAssets(assetTarget, progress, options.onProgress);
    }
    progress.assetsAfter = getAssetStats().total;

    saveCheckpoint(cp);

    let kbEntries = 0;
    try {
      const { KnowledgeBase } = await import("../data-collection/knowledge-base.js");
      const kb = new KnowledgeBase();
      await kb.initialize();
      kbEntries = kb.getStats().totalEntries;
    } catch { /* ignore */ }

    const result: GrowthRunResult = {
      success: true,
      startedAt,
      completedAt: new Date().toISOString(),
      progress,
      knowledgeBaseEntries: kbEntries,
    };
    lastGrowth = result;
    saveStats(result);

    console.log(
      `[Growth] Complete — knowledge=${progress.knowledgeIngested} assets=${progress.assetsBefore}→${progress.assetsAfter} kb=${kbEntries}`,
    );
    return result;
  } finally {
    growthRunning = false;
  }
}

export async function startIntelligenceGrowth(input: {
  assetTarget?: number;
  wait?: boolean;
  fullAssetMining?: boolean;
}) {
  if (growthRunning) throw new Error("Intelligence growth already in progress");
  const run = () =>
    runIntelligenceGrowth({
      assetTarget: input.assetTarget,
      fullAssetMining: input.fullAssetMining,
      onProgress: (p) => {
        if (p.assetQueriesProcessed % 5 === 0) {
          console.log(
            `[Growth] knowledge=${p.knowledgeIngested} assets=${p.assetsAfter} queries=${p.assetQueriesProcessed}`,
          );
        }
      },
    }).catch((err) => {
      console.error("[Growth] Failed:", err);
      throw err;
    });

  if (input.wait) return run();
  run().catch(() => { /* logged */ });
  return {
    started: true,
    assetTarget: input.assetTarget,
    message: "Intelligence growth pipeline started",
  };
}
