import { interpretIntent } from "./intent";
import { decomposeIntent } from "./decompose";
import { validatePlan } from "./validate";
import { selectTools } from "./select-tools";
import { executePlan } from "./execute";
import { verifyExecution } from "./verify";
import { buildReport } from "./report";
import { AutonomyReport, IntentInput, DeviceAutonomyOptions } from "./types";

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

