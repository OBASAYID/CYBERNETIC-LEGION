/**
 * CYRUS Intelligence Automation — runs all intelligence pipelines autonomously.
 * Asset ingestion, ML calibration, MCP health, self-correction, knowledge sync.
 */

import { loadAssetModel } from "../assets/asset-model.js";
import { getIngestStatus, resumeIngestFailures, startIngestMining, startMlTraining } from "../assets/asset-ingest-service.js";
import { loadDocModel } from "../ingestion/doc-model.js";
import { trainDocModel } from "../ingestion/doc-trainer.js";
import { loadVisionModel } from "../scan/vision-model.js";
import { trainVisionModel } from "../scan/vision-trainer.js";
import { loadGwaModel } from "../comms/gwa-model.js";
import { trainGwaModel } from "../comms/gwa-trainer.js";
import { trainAssetModel } from "../assets/asset-trainer.js";
import { checkAllMcpHealth, syncMcpCursorConfig } from "../mcp/mcp-health.js";
import type { PlatformIntelligenceSnapshot } from "./mission-autonomy-core.js";

export type AutomationPhaseResult = {
  phase: string;
  status: "done" | "skipped" | "failed" | "running";
  detail?: string;
  data?: unknown;
};

export type AutomationCycleResult = {
  cycleId: string;
  success: boolean;
  platformScoreBefore: number;
  platformScoreAfter: number;
  phases: AutomationPhaseResult[];
  missionProbe?: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
};

export type AutomationConfig = {
  assetTarget: number;
  trainSimulations: number;
  mineAssets: boolean;
  trainModels: boolean;
  resumeDownloads: boolean;
  mcpHealth: boolean;
  selfCorrect: boolean;
  quickMineBatch: number;
  growKnowledge: boolean;
};

let cycleRunning = false;
let lastCycle: AutomationCycleResult | null = null;
let autoTimer: ReturnType<typeof setInterval> | null = null;

export function getAutomationConfig(): AutomationConfig {
  return {
    assetTarget: parseInt(process.env.CYRUS_AUTO_ASSET_TARGET || "10000", 10) || 10_000,
    trainSimulations: parseInt(process.env.CYRUS_AUTO_TRAIN_SIMULATIONS || "5000", 10) || 5000,
    mineAssets: process.env.CYRUS_AUTO_MINE_ASSETS !== "false",
    trainModels: process.env.CYRUS_AUTO_TRAIN_MODELS !== "false",
    resumeDownloads: process.env.CYRUS_AUTO_RESUME_DOWNLOADS !== "false",
    mcpHealth: process.env.CYRUS_AUTO_MCP_HEALTH !== "false",
    selfCorrect: process.env.CYRUS_AUTO_SELF_CORRECT !== "false",
    quickMineBatch: parseInt(process.env.CYRUS_AUTO_MINE_BATCH || "250", 10) || 250,
    growKnowledge: process.env.CYRUS_AUTO_GROW_KNOWLEDGE !== "false",
  };
}

function platformScoreFromSnapshot(snapshot: PlatformIntelligenceSnapshot): number {
  const scores = Object.values(snapshot.domains).map((d) => d.score);
  const assetBonus = snapshot.assets?.mlModel ? 3 : 0;
  const mcpBonus = snapshot.mcp?.operational ? 2 : 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length + assetBonus + mcpBonus);
}

async function phaseObserve(): Promise<AutomationPhaseResult> {
  const { getPlatformSnapshot } = await import("./mission-autonomy-core.js");
  const snapshot = await getPlatformSnapshot();
  const ingest = getIngestStatus();
  return {
    phase: "observe",
    status: "done",
    detail: `Platform ready — assets=${ingest.total} models=gwa:${snapshot.calibratedModels.gwa} doc:${snapshot.calibratedModels.documents} vision:${snapshot.calibratedModels.vision} asset:${snapshot.calibratedModels.assets}`,
    data: { snapshot, ingest: { total: ingest.total, failed: ingest.failedDownloads?.pending } },
  };
}

async function phaseMcp(): Promise<AutomationPhaseResult> {
  syncMcpCursorConfig();
  const health = await checkAllMcpHealth();
  return {
    phase: "mcp",
    status: health.operational ? "done" : "failed",
    detail: `${health.activeCount}/${health.totalServers} MCP servers operational (${health.totalTools} tools)`,
    data: health,
  };
}

async function phaseResume(): Promise<AutomationPhaseResult> {
  const result = await resumeIngestFailures();
  return {
    phase: "resume_downloads",
    status: "done",
    detail: `Recovered ${result.recovered}, still failed ${result.stillFailed}`,
    data: result,
  };
}

async function phaseMine(config: AutomationConfig): Promise<AutomationPhaseResult> {
  const current = getIngestStatus().total;
  if (current >= config.assetTarget) {
    return {
      phase: "asset_mining",
      status: "skipped",
      detail: `Asset library at ${current.toLocaleString()} (target ${config.assetTarget.toLocaleString()})`,
    };
  }
  const batchTarget = Math.min(config.assetTarget, current + config.quickMineBatch);
  const result = await startIngestMining({
    target: batchTarget,
    useMl: true,
    wait: true,
  });
  return {
    phase: "asset_mining",
    status: "done",
    detail: `Mined toward ${batchTarget.toLocaleString()} (was ${current.toLocaleString()})`,
    data: result,
  };
}

async function phaseCalibrate(config: AutomationConfig): Promise<AutomationPhaseResult> {
  const trained: string[] = [];
  const sims = Math.max(1000, config.trainSimulations);

  if (config.trainModels) {
    if (!loadGwaModel()) {
      await trainGwaModel({ simulations: sims });
      trained.push("gwa");
    }
    if (!loadDocModel()) {
      await trainDocModel({ simulations: sims });
      trained.push("documents");
    }
    if (!loadVisionModel()) {
      await trainVisionModel({ simulations: sims });
      trained.push("vision");
    }
    if (!loadAssetModel()) {
      await trainAssetModel({ simulations: sims });
      trained.push("assets");
    }
  }

  return {
    phase: "calibrate",
    status: trained.length ? "done" : "skipped",
    detail: trained.length ? `Trained: ${trained.join(", ")} (${sims.toLocaleString()} sims each)` : "All calibration models loaded",
    data: { trained },
  };
}

async function phaseKnowledgeGrowth(config: AutomationConfig): Promise<AutomationPhaseResult> {
  try {
    const { runIntelligenceGrowth } = await import("../intelligence/intelligence-growth-miner.js");
    const current = getIngestStatus().total;
    const target = Math.min(config.assetTarget, current + config.quickMineBatch * 2);
    const result = await runIntelligenceGrowth({
      assetTarget: target,
      fullAssetMining: false,
      wikipediaBatch: 12,
      webBatch: 5,
    });
    return {
      phase: "knowledge_growth",
      status: "done",
      detail: `Knowledge ${result.progress.knowledgeIngested} assets ${result.progress.assetsBefore}→${result.progress.assetsAfter}`,
      data: result,
    };
  } catch (err) {
    return {
      phase: "knowledge_growth",
      status: "failed",
      detail: err instanceof Error ? err.message : "Knowledge growth failed",
    };
  }
}
async function phaseRefine(): Promise<AutomationPhaseResult> {
  try {
    if (process.env.USE_LOCAL_LLM === "true" || process.env.CYRUS_OPENAI_INDEPENDENT === "true") {
      const { systemRefinementEngine } = await import("./system-refinement-engine.js");
      const status = systemRefinementEngine.getStatus();
      return {
        phase: "refine",
        status: "skipped",
        detail: "LLM refinement skipped (OpenAI-independent mode); rule-based self-correct applied instead",
        data: status,
      };
    }
    const { systemRefinementEngine } = await import("./system-refinement-engine.js");
    const analysis = await systemRefinementEngine.analyzeSystem();
    return { phase: "refine", status: "done", detail: "System refinement analysis complete", data: analysis };
  } catch (err) {
    return {
      phase: "refine",
      status: "skipped",
      detail: err instanceof Error ? err.message : "Refinement unavailable",
    };
  }
}

async function phaseSelfCorrect(): Promise<AutomationPhaseResult> {
  const { runSelfCorrectionCycle } = await import("./mission-autonomy-core.js");
  const cycle = await runSelfCorrectionCycle();
  return {
    phase: "self_correct",
    status: "done",
    detail: `Mission probe ${cycle.missionProbe.status} confidence=${(cycle.missionProbe.confidence * 100).toFixed(1)}%`,
    data: { probe: cycle.missionProbe, corrections: cycle.missionProbe.corrections },
  };
}

async function phaseVerify(): Promise<AutomationPhaseResult> {
  const { executeMission } = await import("./mission-autonomy-core.js");
  const probe = await executeMission({
    domain: "general",
    objective: "Autonomous intelligence cycle verification — all modules operational",
    autoCorrect: false,
  });
  return {
    phase: "verify",
    status: probe.status === "failed" ? "failed" : "done",
    detail: `Platform probe ${probe.status} score=${probe.platformScore}`,
    data: probe,
  };
}

export async function runIntelligenceAutomationCycle(
  overrides: Partial<AutomationConfig> = {},
): Promise<AutomationCycleResult> {
  if (cycleRunning) throw new Error("Intelligence automation cycle already running");
  cycleRunning = true;

  const config = { ...getAutomationConfig(), ...overrides };
  const cycleId = `auto_${Date.now()}`;
  const startedAt = new Date().toISOString();
  const phases: AutomationPhaseResult[] = [];

  const { getPlatformSnapshot } = await import("./mission-autonomy-core.js");
  const snapshotBefore = await getPlatformSnapshot();
  const platformScoreBefore = platformScoreFromSnapshot(snapshotBefore);

  try {
    phases.push(await phaseObserve());

    if (config.mcpHealth) phases.push(await phaseMcp());
    if (config.resumeDownloads) phases.push(await phaseResume());
    if (config.growKnowledge) phases.push(await phaseKnowledgeGrowth(config));
    if (config.mineAssets) phases.push(await phaseMine(config));
    if (config.trainModels) phases.push(await phaseCalibrate(config));
    phases.push(await phaseRefine());
    if (config.selfCorrect) phases.push(await phaseSelfCorrect());
    const verify = await phaseVerify();
    phases.push(verify);

    const snapshotAfter = await getPlatformSnapshot();
    const platformScoreAfter = platformScoreFromSnapshot(snapshotAfter);
    const success = !phases.some((p) => p.status === "failed");

    const result: AutomationCycleResult = {
      cycleId,
      success,
      platformScoreBefore,
      platformScoreAfter,
      phases,
      missionProbe: verify.data as Record<string, unknown>,
      startedAt,
      completedAt: new Date().toISOString(),
    };

    lastCycle = result;
    console.log(
      `[IntelligenceAuto] Cycle ${cycleId} ${success ? "OK" : "DEGRADED"} score ${platformScoreBefore}→${platformScoreAfter}`,
    );
    return result;
  } finally {
    cycleRunning = false;
  }
}

export function getAutomationStatus() {
  const config = getAutomationConfig();
  const ingest = getIngestStatus();
  return {
    enabled: process.env.CYRUS_INTELLIGENCE_AUTO === "1",
    cycleRunning,
    lastCycle,
    config,
    ingest: { total: ingest.total, target: config.assetTarget },
    models: {
      gwa: Boolean(loadGwaModel()),
      documents: Boolean(loadDocModel()),
      vision: Boolean(loadVisionModel()),
      assets: Boolean(loadAssetModel()),
    },
    openAiIndependent:
      process.env.CYRUS_OPENAI_INDEPENDENT === "true" || process.env.CYRUS_NO_OPENAI === "true",
  };
}

/** Quick autonomous fixes invoked by mission autoCorrect. */
export async function runQuickAutonomousFixes(): Promise<string[]> {
  const fixes: string[] = [];
  const config = getAutomationConfig();

  if (config.resumeDownloads) {
    const r = await resumeIngestFailures();
    if (r.recovered > 0) fixes.push(`Resumed ${r.recovered} failed asset download(s)`);
  }

  if (!loadAssetModel() && config.trainModels) {
    await startMlTraining({ simulations: Math.min(5000, config.trainSimulations), wait: true });
    fixes.push("Trained asset ML scoring model");
  }

  const ingest = getIngestStatus();
  if (config.mineAssets && ingest.total < config.assetTarget) {
    await startIngestMining({
      target: Math.min(config.assetTarget, ingest.total + 50),
      useMl: true,
      wait: false,
    });
    fixes.push(`Started background asset mining (current ${ingest.total})`);
  }

  syncMcpCursorConfig();
  fixes.push("Synced MCP Cursor config");

  return fixes;
}

export function startIntelligenceAutomationScheduler(): void {
  if (process.env.CYRUS_INTELLIGENCE_AUTO !== "1") return;
  if (autoTimer) return;

  const intervalMs = parseInt(process.env.CYRUS_INTELLIGENCE_AUTO_INTERVAL_MS || "3600000", 10) || 3_600_000;
  const bootDelayMs = parseInt(process.env.CYRUS_INTELLIGENCE_AUTO_BOOT_DELAY_MS || "45000", 10) || 45_000;

  console.log(`[IntelligenceAuto] Scheduler enabled — every ${(intervalMs / 60000).toFixed(0)} min`);

  setTimeout(() => {
    runIntelligenceAutomationCycle().catch((err) =>
      console.warn("[IntelligenceAuto] Boot cycle failed:", err instanceof Error ? err.message : err),
    );
  }, bootDelayMs);

  autoTimer = setInterval(() => {
    runIntelligenceAutomationCycle().catch((err) =>
      console.warn("[IntelligenceAuto] Scheduled cycle failed:", err instanceof Error ? err.message : err),
    );
  }, intervalMs);
}

export function stopIntelligenceAutomationScheduler(): void {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}
