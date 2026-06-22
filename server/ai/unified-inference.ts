/**
 * Unified inference facade — every CYRUS task routes through multi-model intelligence
 * with resilient cascade fallbacks (GPT, Claude, Gemini, Grok, local Ollama).
 */

import {
  multiModelIntelligence,
  type MultiModelConfig,
  type MultiModelResponse,
} from "./multi-model-intelligence.js";

export type InferMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InferTaskType =
  | "chat"
  | "code"
  | "analyze"
  | "voice"
  | "document"
  | "comms"
  | "general";

export type UnifiedInferOptions = {
  strategy?: MultiModelConfig["strategy"];
  taskType?: InferTaskType;
  temperature?: number;
  maxTokens?: number;
};

export type UnifiedInferResult = {
  response: string;
  confidence: number;
  model: string;
  strategy: string;
  reasoning: string;
  degraded: boolean;
  modelResponses: MultiModelResponse["modelResponses"];
  systemsUsed: string[];
};

const TASK_STRATEGY: Partial<Record<InferTaskType, MultiModelConfig["strategy"]>> = {
  code: "specialized",
  analyze: "specialized",
  document: "specialized",
  comms: "cascade",
  voice: "cascade",
  chat: "specialized",
  general: "cascade",
};

function defaultStrategy(taskType: InferTaskType): MultiModelConfig["strategy"] {
  const env = process.env.CYRUS_MULTI_MODEL_STRATEGY?.trim() as MultiModelConfig["strategy"] | undefined;
  if (env && ["parallel", "cascade", "voting", "specialized"].includes(env)) {
    return env;
  }
  return TASK_STRATEGY[taskType] || "cascade";
}

function fallbackChain(primary: MultiModelConfig["strategy"]): MultiModelConfig["strategy"][] {
  const chain: MultiModelConfig["strategy"][] = [primary, "cascade", "parallel"];
  return [...new Set(chain)];
}

function normalize(result: MultiModelResponse, degraded: boolean): UnifiedInferResult {
  const top = result.modelResponses[0];
  return {
    response: result.finalResponse,
    confidence: result.confidence,
    model: top?.model || "multi-model",
    strategy: result.strategy,
    reasoning: result.reasoning,
    degraded,
    modelResponses: result.modelResponses,
    systemsUsed: result.modelResponses.map((r) => r.model),
  };
}

export function buildInferMessages(params: {
  systemPrompt?: string;
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}): InferMessage[] {
  const messages: InferMessage[] = [];
  if (params.systemPrompt?.trim()) {
    messages.push({ role: "system", content: params.systemPrompt.trim() });
  }
  for (const msg of params.conversationHistory || []) {
    const role =
      msg.role === "assistant" || msg.role === "cyrus" ? "assistant" : msg.role === "system" ? "system" : "user";
    if (msg.content?.trim()) {
      messages.push({ role, content: String(msg.content) });
    }
  }
  messages.push({ role: "user", content: params.userMessage });
  return messages;
}

export function hasAnyInferenceProvider(): boolean {
  const status = multiModelIntelligence.getStatus();
  return status.providers.length > 0;
}

/**
 * Resilient multi-model inference — never throws; cascades across strategies on failure.
 */
export async function unifiedInfer(
  messages: InferMessage[],
  options: UnifiedInferOptions = {},
): Promise<UnifiedInferResult> {
  const taskType = options.taskType || "general";
  const primary = options.strategy || defaultStrategy(taskType);
  const systemsUsed: string[] = [];
  const strategies = fallbackChain(primary);

  for (const strategy of strategies) {
    try {
      systemsUsed.push(`strategy:${strategy}`);
      const result = await multiModelIntelligence.infer(messages, {
        strategy,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
      if (result.finalResponse?.trim()) {
        const out = normalize(result, strategy !== primary);
        out.systemsUsed = [...systemsUsed, ...out.systemsUsed];
        return out;
      }
    } catch (error) {
      console.warn(
        `[Unified-Infer] ${strategy} failed (${taskType}):`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return {
    response:
      "CYRUS intelligence layers are temporarily unavailable. Verify API keys or local Ollama, then retry.",
    confidence: 0.05,
    model: "none",
    strategy: "exhausted",
    reasoning: "All configured providers and fallback strategies failed",
    degraded: true,
    modelResponses: [],
    systemsUsed,
  };
}

export async function unifiedInferText(
  userMessage: string,
  options: UnifiedInferOptions & { systemPrompt?: string; conversationHistory?: Array<{ role: string; content: string }> } = {},
): Promise<UnifiedInferResult> {
  const { systemPrompt, conversationHistory, ...inferOpts } = options;
  return unifiedInfer(
    buildInferMessages({ systemPrompt, userMessage, conversationHistory }),
    inferOpts,
  );
}
