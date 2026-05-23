#!/usr/bin/env node
/**
 * CLI: mine web images & 3D models into local CYRUS asset library (no OpenAI).
 *
 *   npm run assets:mine
 *   npm run assets:mine -- --target 1000000
 */

import { runAssetMining } from "./asset-miner.js";
import { getAssetStats } from "./asset-registry.js";
import { getFailedDownloadStats } from "./download-failures.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let target = 10_000;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--target" || args[i] === "-n") {
      target = parseInt(args[++i] || "10000", 10);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`CYRUS open asset miner (web + Wikimedia, no OpenAI)

Options:
  --target, -n   Target asset count (default: 10000; use 1000000 for large runs)
`);
      process.exit(0);
    }
  }
  return { target: Math.max(1, target) };
}

async function main() {
  const { target } = parseArgs();
  console.log(`[Assets] Mining toward ${target.toLocaleString()} entries…`);
  console.log(`[Assets] Storage: data/assets/`);
  console.log(`[Assets] Pending failures: ${getFailedDownloadStats().pending}`);
  console.log(`[Assets] ML mining: ${process.env.CYRUS_ML_ASSETS !== "false" ? "enabled" : "disabled"}`);
  console.log(`[Assets] Set CYRUS_OPENAI_INDEPENDENT=true to disable OpenAI fallbacks.`);

  const started = Date.now();
  const result = await runAssetMining({
    target,
    onProgress: (p) => {
      if (p.queriesProcessed % 5 === 0 || p.ingested >= p.target) {
        console.log(
          `[Assets] ingested=${p.ingested.toLocaleString()}/${p.target.toLocaleString()} queries=${p.queriesProcessed} failed=${p.failed}`,
        );
      }
    },
  });

  const stats = getAssetStats();
  console.log(`[Assets] Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`[Assets] Registry total: ${stats.total.toLocaleString()} (${JSON.stringify(stats.byKind)})`);
  console.log(`[Assets] Result:`, result);
}

main().catch((err) => {
  console.error("[Assets] Failed:", err);
  process.exit(1);
});
