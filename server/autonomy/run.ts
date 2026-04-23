import { interpretIntent } from "./intent.js";
import { decomposeIntent } from "./decompose.js";
import { validatePlan } from "./validate.js";
import { selectTools } from "./select-tools.js";
import { executePlan } from "./execute.js";
import { verifyExecution } from "./verify.js";
import { buildReport } from "./report.js";
import { AutonomyReport, IntentInput, DeviceAutonomyOptions } from "./types.js";

interface RunOptions {
  allowLiveTrading?: boolean;
  hasBrokerKeys?: boolean;
  hasVectorStore?: boolean;
  device?: DeviceAutonomyOptions;
}

export async function runAutonomy(input: IntentInput, options: RunOptions = {}): Promise<AutonomyReport> {
  const intent = await interpretIntent(input);
  const plan = decomposeIntent(intent);

  const validation = validatePlan(plan, {
    allowLiveTrading: !!options.allowLiveTrading,
    hasBrokerKeys: !!options.hasBrokerKeys,
    hasVectorStore: !!options.hasVectorStore,
  });

  const toolMap = selectTools(plan);

  const execution = await executePlan(plan, toolMap, {
    simulateTrading: !options.allowLiveTrading || !options.hasBrokerKeys,
    device: options.device,
  });

  const verification = verifyExecution(execution);
  const report = buildReport(intent, plan, validation, toolMap, execution, verification);
  return report;
}

