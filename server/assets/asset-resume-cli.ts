#!/usr/bin/env node
/**
 * Resume failed asset downloads (partial streams + failure journal).
 *
 *   npm run assets:resume
 *   npm run assets:resume -- --then-mine --target 500
 */

import { getAssetStats } from "./asset-registry.js";
import { getFailedDownloadStats } from "./download-failures.js";
import { resumeFailedDownloads, runAssetMining } from "./asset-miner.js";
import { OPEN_MODEL_URLS } from "./seed-catalog.js";
import { downloadAndRegisterAsset } from "./asset-downloader.js";
import { loadAssetRegistry } from "./asset-registry.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let target = 10_000;
  let thenMine = false;
  let bootstrapModels = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--target" || args[i] === "-n") {
      target = parseInt(args[++i] || "10000", 10);
    } else if (args[i] === "--then-mine") {
      thenMine = true;
    } else if (args[i] === "--no-bootstrap") {
      bootstrapModels = false;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`CYRUS asset download resume

Options:
  --then-mine       Continue mining after resume
  --target, -n      Mining target when --then-mine (default 10000)
  --no-bootstrap    Skip retrying bootstrap 3D models
`);
      process.exit(0);
    }
  }
  return { target: Math.max(1, target), thenMine, bootstrapModels };
}

async function bootstrapMissingModels(): Promise<number> {
  const seen = new Set(loadAssetRegistry().map((r) => r.sourceUrl));
  let recovered = 0;
  for (const model of OPEN_MODEL_URLS) {
    if (seen.has(model.url) || (model.mirrors || []).some((m) => seen.has(m))) continue;
    for (const url of [model.url, ...(model.mirrors || [])]) {
      const r = await downloadAndRegisterAsset({
        url,
        title: model.title,
        domain: model.domain,
        tags: ["3d", "bootstrap"],
        license: model.license,
      });
      if (r) {
        recovered += 1;
        break;
      }
    }
  }
  return recovered;
}

async function main() {
  const { target, thenMine, bootstrapModels } = parseArgs();
  const before = getFailedDownloadStats();
  console.log(`[Assets] Pending failed downloads: ${before.pending}`);

  const started = Date.now();
  const result = await resumeFailedDownloads();
  console.log(`[Assets] Resume complete: recovered=${result.recovered} stillFailed=${result.stillFailed}`);

  if (bootstrapModels) {
    const boot = await bootstrapMissingModels();
    if (boot > 0) console.log(`[Assets] Bootstrap 3D models recovered: ${boot}`);
  }

  const stats = getAssetStats();
  console.log(`[Assets] Registry total: ${stats.total.toLocaleString()} (${JSON.stringify(stats.byKind)})`);
  console.log(`[Assets] Resume finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  if (thenMine) {
    console.log(`[Assets] Continuing mining toward ${target.toLocaleString()}…`);
    await runAssetMining({
      target,
      resumeFailures: false,
      onProgress: (p) => {
        if (p.queriesProcessed % 5 === 0) {
          console.log(
            `[Assets] ingested=${p.ingested.toLocaleString()}/${p.target.toLocaleString()} failed=${p.failed}`,
          );
        }
      },
    });
    console.log(`[Assets] Mining complete. Total: ${getAssetStats().total.toLocaleString()}`);
  }
}

main().catch((err) => {
  console.error("[Assets] Resume failed:", err);
  process.exit(1);
});
