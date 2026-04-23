import { IntentResult, PlanStep, RiskLevel } from "./types.js";

function riskForAction(action: string): RiskLevel {
  if (action.includes("trade") || action.includes("device")) return "high";
  if (action.includes("analyze") || action.includes("summarize")) return "medium";
  return "low";
}

export function decomposeIntent(intent: IntentResult): PlanStep[] {
  const steps: PlanStep[] = [];

  // Step 1: gather context / retrieve knowledge
  steps.push({
    id: "gather",
    title: "Gather context and knowledge",
    action: "rag_retrieve",
    target: "knowledge_base",
    dependencies: [],
    risk: "low",
    status: "pending",
  });

  // Step 2: decide toolchain based on domain
  steps.push({
    id: "plan",
    title: "Plan toolchain",
    action: `plan_${intent.primaryDomain}`,
    target: intent.primaryDomain,
    dependencies: ["gather"],
    risk: "low",
    status: "pending",
  });

  // Step 3: execute domain-specific work
  const execAction =
    intent.primaryDomain === "trading" ? "execute_trading" :
    intent.primaryDomain === "design" ? "execute_design" :
    intent.primaryDomain === "vision" ? "execute_vision" :
    intent.primaryDomain === "audio" ? "execute_audio" :
    intent.primaryDomain === "device" ? "execute_device" :
    "execute_general";

  steps.push({
    id: "execute",
    title: "Execute task",
    action: execAction,
    target: intent.goal,
    dependencies: ["plan"],
    risk: riskForAction(execAction),
    status: "pending",
  });

  // Step 4: verify results
  steps.push({
    id: "verify",
    title: "Verify output",
    action: "verify_output",
    target: intent.goal,
    dependencies: ["execute"],
    risk: "medium",
    status: "pending",
  });

  // Step 5: report
  steps.push({
    id: "report",
    title: "Report",
    action: "report",
    target: "operator",
    dependencies: ["verify"],
    risk: "low",
    status: "pending",
  });

  return steps;
}

