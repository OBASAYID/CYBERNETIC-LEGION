import { AutonomyReport, ExecutionResult, IntentResult, PlanStep, ToolSelection, ValidationResult, VerificationResult } from "./types.js";

export function buildReport(
  intent: IntentResult,
  plan: PlanStep[],
  validation: ValidationResult,
  toolMap: ToolSelection[],
  execution: ExecutionResult[],
  verification: VerificationResult[]
): AutonomyReport {
  const failed = verification.find((v) => v.status === "fail");
  const summary = failed
    ? `Autonomy run partially failed at step ${failed.stepId}: ${failed.notes.join("; ")}`
    : "Autonomy run completed successfully.";

  return {
    intent,
    plan,
    validation,
    toolMap,
    execution,
    verification,
    summary,
  };
}

