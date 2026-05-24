#!/usr/bin/env node
/**
 * CLI: train document intelligence calibration model.
 *
 * Usage:
 *   npm run doc:train
 *   npm run doc:train -- --simulations 1000000
 */

import { trainDocModel } from "./doc-trainer.js";

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
      console.log(`CYRUS Document Intelligence trainer

Options:
  --simulations, -n   Number of synthetic documents (default: 1000000)
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

  console.log(`[Doc Train] Starting ${simulations.toLocaleString()} simulations…`);
  console.log(`[Doc Train] Ridge λ=${lambda}, blend=${blend}`);

  const model = await trainDocModel({
    simulations,
    ridgeLambda: lambda,
    blend,
    batchLogEvery: Math.max(10_000, Math.floor(simulations / 20)),
    onProgress: (p) => {
      console.log(
        `[Doc Train] ${p.completed.toLocaleString()}/${p.total.toLocaleString()} sims | samples=${p.samples.toLocaleString()} | MAE before=${p.maeBefore.toFixed(2)}`,
      );
    },
  });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[Doc Train] Done in ${elapsed}s`);
  console.log(`[Doc Train] MAE ${model.metrics.maeBefore} → ${model.metrics.maeAfter} | R²=${model.metrics.r2After}`);
  console.log(`[Doc Train] Saved to server/ingestion/doc-models/current.json`);
}

main().catch((err) => {
  console.error("[Doc Train] Failed:", err);
  process.exit(1);
});
