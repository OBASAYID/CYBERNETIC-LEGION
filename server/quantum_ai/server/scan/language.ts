import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const langClient =
  openaiApiKey
    ? new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl })
    : null;

export interface LangDetectResult {
  language: string;
  confidence: number;
  warnings: string[];
}

export async function detectLanguage(text: string): Promise<LangDetectResult> {
  const warnings: string[] = [];
  if (!langClient) {
    warnings.push("Language detection unavailable (missing OpenAI config).");
    return { language: "unknown", confidence: 0.2, warnings };
  }
  try {
    const resp = await langClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Detect the language of the user text. Respond with JSON {language, confidence} where confidence is 0-1.",
        },
        { role: "user", content: text.slice(0, 500) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    });
    const parsed = JSON.parse(resp.choices[0].message.content || "{}");
    return {
      language: parsed.language || "unknown",
      confidence: Number(parsed.confidence) || 0.5,
      warnings,
    };
  } catch (err: any) {
    warnings.push(`Language detect failed: ${err?.message || err}`);
    return { language: "unknown", confidence: 0.2, warnings };
  }
}

