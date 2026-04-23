import { PlanStep, ValidationResult } from "./types";

interface ValidationContext {
  allowLiveTrading: boolean;
  hasBrokerKeys: boolean;
  hasVectorStore: boolean;
}

export function validatePlan(steps: PlanStep[], ctx: ValidationContext): ValidationResult {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (!ctx.hasVectorStore) {
    warnings.push("Vector store not configured; RAG retrieval will be skipped.");
  }

  const tradingStep = steps.find((s) => s.action === "execute_trading");
  if (tradingStep) {
    if (!ctx.hasBrokerKeys) {
      warnings.push("Broker keys missing; trading will run in simulation-only mode.");
    }
    if (!ctx.allowLiveTrading) {
      warnings.push("Live trading disabled by configuration; confirmations required to enable.");
    }
  }

  const ok = blockingIssues.length === 0;
  return { ok, blockingIssues, warnings };
}

