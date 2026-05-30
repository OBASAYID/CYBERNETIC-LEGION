#!/usr/bin/env node
/**
 * CLI: train GWA calibration model from synthetic simulations.
 *
 * Usage:
 *   npm run gwa:train
 *   npm run gwa:train -- --simulations 1000000
 *   npm run gwa:train -- --simulations 50000 --lambda 3
 */

import { trainGwaModel } from "./gwa-trainer.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let simulations = 1_000_000;
  let lambda = 2.5;
  let blend = 0.72;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--simulations" || args[i] === "-n") {
      simulations = parseInt(args[++i] || "1000000", 10);
    } else if (args[i] === "--lambda") {
      lambda = parseFloat(args[++i] || "2.5");
    } else if (args[i] === "--blend") {
      blend = parseFloat(args[++i] || "0.72");
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`CYRUS GWA trainer

Options:
  --simulations, -n   Number of team simulations (default: 1000000)
  --lambda            Ridge regularization (default: 2.5)
  --blend             Model vs heuristic blend 0-1 (default: 0.72)
`);
      process.exit(0);
    }
  }

  return { simulations, lambda, blend };
}

async function main() {
  const { simulations, lambda, blend } = parseArgs();
  const started = Date.now();

  console.log(`[GWA Train] Starting ${simulations.toLocaleString()} simulations…`);
  console.log(`[GWA Train] Ridge λ=${lambda}, blend=${blend}`);

  const model = await trainGwaModel({
    simulations,
    ridgeLambda: lambda,
    blend,
    batchLogEvery: Math.max(5000, Math.floor(simulations / 25)),
    onProgress: (p) => {
      const pct = ((p.completed / p.total) * 100).toFixed(1);
      process.stdout.write(
        `\r[GWA Train] ${pct}% (${p.completed.toLocaleString()}/${p.total.toLocaleString()}) samples=${p.samples.toLocaleString()} MAE before=${p.maeBefore.toFixed(2)}`,
      );
    },
  });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log("\n");
  console.log("[GWA Train] Complete");
  console.log(`  Simulations: ${model.simulations.toLocaleString()}`);
  console.log(`  Samples:     ${model.samples.toLocaleString()}`);
  console.log(`  MAE before:  ${model.metrics.maeBefore}`);
  console.log(`  MAE after:   ${model.metrics.maeAfter}`);
  console.log(`  R² after:    ${model.metrics.r2After}`);
  console.log(`  Model:       server/comms/gwa-models/current.json`);
  console.log(`  Elapsed:     ${elapsed}s`);
  console.log(`  Algorithm:   ${model.algorithmVersion}`);
}

main().catch((e) => {
  console.error("[GWA Train] Failed:", e);
  process.exit(1);
});
