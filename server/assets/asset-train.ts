#!/usr/bin/env node
/**
 * Train CYRUS asset intelligence model (ridge calibration / ML scoring).
 *
 *   npm run assets:train
 *   npm run assets:train:1m -- --simulations 1000000
 */

import { trainAssetModel } from "./asset-trainer.js";
import { loadAssetModel } from "./asset-model.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let simulations = 50_000;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--simulations" || args[i] === "-n") {
      simulations = parseInt(args[++i] || "50000", 10);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`CYRUS asset ML trainer

Options:
  --simulations, -n   Simulation count (default 50000; use 1000000 for large runs)
`);
      process.exit(0);
    }
  }
  return { simulations: Math.max(1000, simulations) };
}

async function main() {
  const { simulations } = parseArgs();
  console.log(`[AssetML] Training on ${simulations.toLocaleString()} simulated mining scenarios…`);

  const started = Date.now();
  const model = await trainAssetModel({
    simulations,
    onProgress: (p) => {
      if (p.completed % Math.max(5000, Math.floor(simulations / 10)) === 0 || p.completed === p.total) {
        console.log(
          `[AssetML] ${p.completed.toLocaleString()}/${p.total.toLocaleString()} MAE before=${p.maeBefore.toFixed(2)}`,
        );
      }
    },
  });

  console.log(`[AssetML] Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`[AssetML] MAE ${model.metrics.maeBefore.toFixed(2)} → ${model.metrics.maeAfter.toFixed(2)} R²=${model.metrics.r2After}`);
  console.log(`[AssetML] Model: server/assets/asset-models/current.json`);
  console.log(`[AssetML] Loaded check:`, loadAssetModel(true)?.algorithmVersion);
}

main().catch((err) => {
  console.error("[AssetML] Training failed:", err);
  process.exit(1);
});
