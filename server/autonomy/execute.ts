import { ExecutionResult, PlanStep, ToolSelection, DeviceAutonomyOptions } from "./types.js";
import { executeDeviceCommand } from "../device/controller.js";

interface ExecuteOptions {
  simulateTrading?: boolean;
  device?: DeviceAutonomyOptions;
}

export async function executePlan(
  steps: PlanStep[],
  toolMap: ToolSelection[],
  options: ExecuteOptions = {}
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const step of steps) {
    const startedAt = new Date().toISOString();
    let status: ExecutionResult["status"] = "success";
    let detail = "completed";

    try {
      if (step.action === "execute_trading" && options.simulateTrading) {
        detail = "Executed in simulation mode";
      }

      if (step.action === "rag_retrieve") {
        detail = "Retrieved context from knowledge base (stub)";
      }

      if (step.action === "execute_vision") {
        detail = "Vision task delegated (stub).";
      }

      if (step.action === "execute_audio") {
        detail = "Audio task delegated (stub).";
      }

      if (step.action === "execute_design") {
        detail = "Design automation delegated (stub).";
      }

      if (step.action === "execute_device") {
        const defaultDryRun = process.env.DEVICE_DRY_RUN_DEFAULT === "true";
        const devicePayload =
          options.device?.deviceCommand || {
            action: "focus_app" as const,
            appName: process.env.DEVICE_DEFAULT_APP || "Finder",
            dryRun: defaultDryRun,
          };
        if (devicePayload.dryRun === undefined) devicePayload.dryRun = defaultDryRun;
        // Ensure confirmation is enforced only at route layer; strip here if present
        if ("confirmToken" in devicePayload) {
          delete (devicePayload as any).confirmToken;
        }
        const deviceResult = await executeDeviceCommand(devicePayload);
        status = deviceResult.success ? "success" : "failed";
        detail = deviceResult.detail;
      }

      // In a fuller implementation, dispatch to actual services here.
    } catch (err: any) {
      status = "failed";
      detail = err?.message || "execution failed";
    }

    const finishedAt = new Date().toISOString();
    results.push({ stepId: step.id, status, detail, startedAt, finishedAt });
  }

  return results;
}

