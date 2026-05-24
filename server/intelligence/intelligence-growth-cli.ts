#!/usr/bin/env node
/**
 * CYRUS Intelligence Growth — mine Wikipedia + web knowledge and assets.
 *
 *   npm run intelligence:grow
 *   npm run intelligence:grow -- --target 2000 --full-mine
 */

import { getGrowthStatus, runIntelligenceGrowth } from "./intelligence-growth-miner.js";

function parseFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseNumber(name: string): number | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  const n = parseInt(process.argv[idx + 1], 10);
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  if (parseFlag("status")) {
    console.log(JSON.stringify(getGrowthStatus(), null, 2));
    return;
  }

  const assetTarget = parseNumber("target");
  const fullAssetMining = parseFlag("full-mine");
  const wikiBatch = parseNumber("wiki-batch");
  const webBatch = parseNumber("web-batch");

  console.log("[Growth] CYRUS intelligence growth — online knowledge + assets");
  console.log("[Growth] OpenAI-independent:", process.env.CYRUS_OPENAI_INDEPENDENT === "true");
  console.log("[Growth] ML assets:", process.env.CYRUS_ML_ASSETS !== "false");
  console.log("[Growth] Knowledge sync:", process.env.CYRUS_ML_KNOWLEDGE_SYNC !== "false");

  const started = Date.now();
  const result = await runIntelligenceGrowth({
    assetTarget,
    fullAssetMining,
    wikipediaBatch: wikiBatch,
    webBatch,
    onProgress: (p) => {
      if ((p.topicsProcessed + p.webPagesProcessed) % 10 === 0 || p.assetQueriesProcessed % 10 === 0) {
        console.log(
          `[Growth] knowledge=${p.knowledgeIngested} assets=${p.assetsAfter} wiki=${p.topicsProcessed} web=${p.webPagesProcessed}`,
        );
      }
    },
  });

  console.log(`[Growth] Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("[Growth] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
