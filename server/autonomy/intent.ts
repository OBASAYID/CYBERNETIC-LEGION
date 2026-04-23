import OpenAI from "openai";
import { IntentInput, IntentResult } from "./types.js";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const openaiClient =
  openaiApiKey
    ? new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl })
    : null;

export async function interpretIntent(input: IntentInput): Promise<IntentResult> {
  // If OpenAI config is missing, fall back to a deterministic heuristic parser.
  if (!openaiClient) {
    const lowered = input.goal.toLowerCase();
    const modalities: IntentInput["modality"] = [];
    if (lowered.includes("image") || lowered.includes("photo")) modalities.push("vision");
    if (lowered.includes("audio") || lowered.includes("voice")) modalities.push("audio");
    if (lowered.includes("trade") || lowered.includes("market")) modalities.push("trading");
    if (lowered.includes("design")) modalities.push("design");
    if (lowered.includes("click") || lowered.includes("type") || lowered.includes("open app") || lowered.includes("pointer") || lowered.includes("cursor")) modalities.push("device");
    const domain =
      modalities.includes("trading") ? "trading" :
      modalities.includes("vision") ? "vision" :
      modalities.includes("audio") ? "audio" :
      modalities.includes("device") ? "device" :
      "general";

    return {
      goal: input.goal,
      confidence: 0.62,
      primaryDomain: domain,
      requiredModalities: modalities.length ? modalities : ["text"],
      notes: ["Heuristic intent because OpenAI config is missing."],
    };
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You classify user goals for an autonomy controller. Extract primary domain and required modalities (text, vision, audio, device, trading, design). Return JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            goal: input.goal,
            context: input.context,
            modality: input.modality,
          }),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return {
      goal: input.goal,
      confidence: Number(parsed.confidence) || 0.75,
      primaryDomain: parsed.primaryDomain || "general",
      requiredModalities: parsed.requiredModalities || input.modality || ["text"],
      notes: ["LLM-derived intent classification"],
    };
  } catch (err) {
    console.error("[autonomy:intent] fallback to heuristic", err);
    return {
      goal: input.goal,
      confidence: 0.55,
      primaryDomain: "general",
      requiredModalities: input.modality || ["text"],
      notes: ["LLM intent failed; heuristic used"],
    };
  }
}

