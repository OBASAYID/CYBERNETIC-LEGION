import { PlanStep, ToolSelection } from "./types.js";

export function selectTools(steps: PlanStep[]): ToolSelection[] {
  return steps.map((step) => {
    let tool = "llm";
    if (step.action === "rag_retrieve") tool = "rag";
    if (step.action === "execute_trading") tool = "trading_service";
    if (step.action === "execute_design") tool = "design_service";
    if (step.action === "execute_vision") tool = "vision_service";
    if (step.action === "execute_audio") tool = "audio_service";
    if (step.action === "execute_device") tool = "device_controller";
    if (step.action === "execute_general") tool = "llm_orchestration";
    if (step.action === "report") tool = "reporting";

    return {
      stepId: step.id,
      tool,
      rationale: `Selected tool for ${step.action}`,
    };
  });
}

