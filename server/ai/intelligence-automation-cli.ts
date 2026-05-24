#!/usr/bin/env node
/** Run one CYRUS intelligence automation cycle from the CLI. */

import {
  getAutomationStatus,
  runIntelligenceAutomationCycle,
} from "./intelligence-automation-core.js";

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
    console.log(JSON.stringify(getAutomationStatus(), null, 2));
    return;
  }

  const overrides = {
    assetTarget: parseNumber("target"),
    trainSimulations: parseNumber("simulations"),
    quickMineBatch: parseNumber("batch"),
    mineAssets: parseFlag("no-mine") ? false : undefined,
    trainModels: parseFlag("no-train") ? false : undefined,
    resumeDownloads: parseFlag("no-resume") ? false : undefined,
    mcpHealth: parseFlag("no-mcp") ? false : undefined,
    selfCorrect: parseFlag("no-correct") ? false : undefined,
  };

  console.log("[IntelligenceAuto] Starting cycle…");
  const result = await runIntelligenceAutomationCycle(
    Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)),
  );

  console.log(
    `[IntelligenceAuto] ${result.success ? "OK" : "DEGRADED"} score ${result.platformScoreBefore}→${result.platformScoreAfter}`,
  );
  for (const phase of result.phases) {
    console.log(`  ${phase.status.padEnd(7)} ${phase.phase}: ${phase.detail ?? ""}`);
  }
}

main().catch((err) => {
  console.error("[IntelligenceAuto] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
