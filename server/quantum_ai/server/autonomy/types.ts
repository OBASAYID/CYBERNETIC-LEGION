export type RiskLevel = "low" | "medium" | "high";

export interface IntentInput {
  goal: string;
  context?: string;
  modality?: Array<"text" | "vision" | "audio" | "device" | "trading" | "design">;
}

export interface IntentResult {
  goal: string;
  confidence: number;
  primaryDomain: string;
  requiredModalities: IntentInput["modality"];
  notes?: string[];
}

export interface PlanStep {
  id: string;
  title: string;
  action: string;
  target?: string;
  dependencies?: string[];
  risk: RiskLevel;
  status: "pending" | "in_progress" | "completed" | "skipped" | "failed";
}

export interface ValidationResult {
  ok: boolean;
  blockingIssues: string[];
  warnings: string[];
}

export interface ToolSelection {
  stepId: string;
  tool: string;
  rationale: string;
}

export interface ExecutionResult {
  stepId: string;
  status: "success" | "failed" | "skipped";
  detail: string;
  startedAt: string;
  finishedAt: string;
}

export interface VerificationResult {
  stepId: string;
  status: "pass" | "fail";
  notes: string[];
}

export interface DeviceAutonomyOptions {
  deviceCommand?: import("../device/controller").DeviceCommand;
}

export interface AutonomyReport {
  intent: IntentResult;
  plan: PlanStep[];
  validation: ValidationResult;
  toolMap: ToolSelection[];
  execution: ExecutionResult[];
  verification: VerificationResult[];
  summary: string;
}

