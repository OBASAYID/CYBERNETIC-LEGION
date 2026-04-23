import axios from "axios";

import { executePlugin } from "../plugins/index.js";
import { queryMemory, storeMemory } from "./memoryService.js";
import { createOperatorAssertion } from "./operatorAssertion.js";
import { getCyrusAiBaseUrl } from "./cyrusAiUrl.js";

const MEMORY_URL = getCyrusAiBaseUrl();
const cognitiveClient = axios.create({
  baseURL: MEMORY_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export async function processBrain(
  input: string,
  operator?: { operatorId: string; role: string; source?: string }
): Promise<any> {
  if (!input || typeof input !== "string") {
    throw new Error("input is required for brain processing");
  }

  if (operator) {
    return processBrainWithOperator(input, operator);
  }

  const res = await cognitiveClient.post("/cognitive/process", { input });
  return res.data;
}

async function processBrainWithOperator(
  input: string,
  operator?: { operatorId: string; role: string; source?: string }
): Promise<any> {
  if (!operator) {
    return processBrain(input);
  }

  const assertion = createOperatorAssertion({
    operatorId: operator.operatorId,
    role: operator.role,
    source: operator.source,
    method: "POST",
    path: "/cognitive/process",
  });

  const headers = assertion
    ? { "x-operator-assertion": assertion }
    : {
        "x-operator-id": operator.operatorId,
        "x-operator-role": operator.role,
      };

  const res = await cognitiveClient.post("/cognitive/process", { input }, { headers });
  return res.data;
}

const tools: Record<string, (input: string) => Promise<unknown>> = {
  memory_search: queryMemory,
  memory_store: storeMemory,
};

export async function executeDecision(input: string, operator?: { operatorId: string; role: string; source?: string }) {
  let decision: any;

  try {
    decision = await processBrainWithOperator(input, operator);
  } catch (error) {
    return {
      action: "none",
      decision: {
        plan: ["analyze_input", "retrieve_memory", "reason_decision", "execute_action", "evaluate_result"],
        decision: {
          intent: "degraded_mode",
          action: "none",
          confidence: 0,
          reasoning: error instanceof Error ? error.message : "AI service unavailable",
        },
      },
    };
  }

  const action =
    decision?.decision?.action ??
    decision?.result?.action?.action ??
    decision?.result?.action;

  if (action && tools[action]) {
    try {
      const result = await tools[action](input);
      return { action, result, decision };
    } catch (error) {
      return {
        action,
        result: null,
        error: error instanceof Error ? error.message : String(error),
        decision,
      };
    }
  }

  if (typeof action === "string" && action.startsWith("plugin:")) {
    const pluginName = action.replace("plugin:", "").trim();
    const grantedPermissions = (process.env.CYRUS_PLUGIN_PERMISSIONS || "log:write")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const result = await executePlugin(pluginName, { input, decision }, grantedPermissions);
      return { action, result, decision };
    } catch (error) {
      return {
        action,
        result: null,
        error: error instanceof Error ? error.message : String(error),
        decision,
      };
    }
  }

  return { action: "none", decision };
}
