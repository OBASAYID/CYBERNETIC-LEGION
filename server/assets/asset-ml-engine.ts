/**
 * ML / data-mining engine for asset ingestion — query expansion, clustering, knowledge sync.
 */

import { loadAssetRegistry } from "./asset-registry.js";
import { loadAssetModel } from "./asset-model.js";
import { rankAssetCandidates } from "./asset-scoring-core.js";
import { ASSET_SEED_QUERIES } from "./seed-catalog.js";
import type { AssetDomain } from "../../shared/asset-types.js";

export type MlMiningQuery = {
  query: string;
  domain: AssetDomain;
  tags: string[];
  preferWikimedia?: boolean;
  mlPriority?: number;
};

export type MlMiningStatus = {
  mlActive: boolean;
  modelLoaded: boolean;
  algorithmVersion?: string;
  metrics?: { maeBefore: number; maeAfter: number; r2After: number };
  registrySize: number;
  expandedQueries: number;
  topDomains: Record<string, number>;
};

/** TF-IDF-style term mining from ingested asset tags. */
export function mineTagVocabulary(limit = 40): Array<{ term: string; score: number; domain: AssetDomain }> {
  const records = loadAssetRegistry();
  const docFreq = new Map<string, number>();
  const termDomain = new Map<string, Map<AssetDomain, number>>();

  for (const r of records) {
    const terms = new Set([...r.tags, ...r.title.toLowerCase().split(/\W+/).filter((t) => t.length > 3)]);
    for (const term of terms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
      const dm = termDomain.get(term) || new Map();
      dm.set(r.domain, (dm.get(r.domain) || 0) + 1);
      termDomain.set(term, dm);
    }
  }

  const n = Math.max(1, records.length);
  const scored: Array<{ term: string; score: number; domain: AssetDomain }> = [];

  for (const [term, df] of docFreq) {
    if (df < 2 || term.length < 4) continue;
    const idf = Math.log(1 + n / df);
    const dm = termDomain.get(term)!;
    let bestDomain: AssetDomain = "general";
    let bestCount = 0;
    for (const [d, c] of dm) {
      if (c > bestCount) {
        bestCount = c;
        bestDomain = d;
      }
    }
    scored.push({ term, score: df * idf, domain: bestDomain });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** K-means style domain clustering from tag vectors (lightweight, no deps). */
export function clusterDomains(k = 5): Array<{ centroid: AssetDomain; terms: string[]; weight: number }> {
  const vocab = mineTagVocabulary(60);
  const byDomain = new Map<AssetDomain, string[]>();
  for (const v of vocab) {
    const list = byDomain.get(v.domain) || [];
    list.push(v.term);
    byDomain.set(v.domain, list);
  }
  return [...byDomain.entries()]
    .map(([centroid, terms]) => ({
      centroid,
      terms: terms.slice(0, 8),
      weight: terms.length,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, k);
}

/** Expand seed catalog using mined terms + ML clusters. */
export function expandMiningQueries(baseLimit = 20): MlMiningQuery[] {
  const base = ASSET_SEED_QUERIES.map((s) => ({
    query: s.query,
    domain: s.domain,
    tags: s.tags,
    preferWikimedia: s.preferWikimedia,
  }));

  const clusters = clusterDomains(6);
  const expanded: MlMiningQuery[] = [...base];

  for (const cluster of clusters) {
    for (const term of cluster.terms.slice(0, 3)) {
      const query = `${term} ${cluster.centroid} diagram illustration`;
      if (expanded.some((e) => e.query === query)) continue;
      expanded.push({
        query,
        domain: cluster.centroid,
        tags: [term, cluster.centroid, "ml-expanded"],
        preferWikimedia: true,
        mlPriority: cluster.weight,
      });
    }
  }

  return expanded.slice(0, baseLimit + clusters.length * 3);
}

export function rankCandidateUrls(
  urls: string[],
  query: string,
  domain: AssetDomain,
  tags: string[],
  minPriority = 42,
): string[] {
  const ranked = rankAssetCandidates(
    urls.map((url) => ({ url, title: query })),
    query,
    domain,
    tags,
    minPriority,
  );
  return ranked.map((r) => r.url);
}

export function getMlMiningStatus(): MlMiningStatus {
  const model = loadAssetModel();
  const records = loadAssetRegistry();
  const topDomains: Record<string, number> = {};
  for (const r of records) topDomains[r.domain] = (topDomains[r.domain] || 0) + 1;

  return {
    mlActive: process.env.CYRUS_ML_ASSETS !== "false",
    modelLoaded: Boolean(model),
    algorithmVersion: model?.algorithmVersion,
    metrics: model?.metrics,
    registrySize: records.length,
    expandedQueries: expandMiningQueries().length,
    topDomains,
  };
}

/** Sync ingested asset metadata into CYRUS learning/knowledge stack. */
export async function syncAssetToKnowledge(input: {
  title: string;
  domain: AssetDomain;
  tags: string[];
  sourceUrl: string;
  license?: string;
}): Promise<void> {
  if (process.env.CYRUS_ML_KNOWLEDGE_SYNC === "false") return;
  try {
    const { cyrusBrain } = await import("../ai/cyrus-brain.js");
    const { learningSystem } = await import("../ai/learning-system.js");
    const content = `Asset ingested: ${input.title} [${input.domain}] tags=${input.tags.join(",")} url=${input.sourceUrl}${input.license ? ` license=${input.license}` : ""}`;
    await cyrusBrain.addKnowledge(content, { sourceType: "dataset", domain: input.domain, assetUrl: input.sourceUrl });
    await learningSystem.learnFromDocument(content, { domain: input.domain, tags: input.tags, assetUrl: input.sourceUrl });
  } catch (err) {
    console.warn("[AssetML] Knowledge sync skipped:", err instanceof Error ? err.message : err);
  }
}

export function isMlMiningEnabled(): boolean {
  return process.env.CYRUS_ML_ASSETS !== "false";
}
