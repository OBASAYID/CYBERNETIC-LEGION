import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const txClient =
  openaiApiKey
    ? new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl })
    : null;

export interface TranslateOptions {
  target: string;
  source?: string;
  mode?: "business" | "casual" | "legal" | "technical" | "military";
}

export interface TranslateResult {
  translated: string;
  warnings: string[];
}

export async function translateText(text: string, opts: TranslateOptions): Promise<TranslateResult> {
  const warnings: string[] = [];
  if (!txClient) {
    warnings.push("Translation unavailable (missing OpenAI config).");
    return { translated: "", warnings };
  }
  const mode = opts.mode || "business";
  const toneByMode: Record<string, string> = {
    business: "formal and concise",
    casual: "plain and friendly",
    legal: "precise, formal, legally faithful",
    technical: "exact, terminology-preserving",
    military: "concise, directive, neutral",
  };
  const tone = toneByMode[mode] || toneByMode.business;

  try {
    const resp = await txClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Translate the user text to ${opts.target}. Tone: ${tone}. Preserve meaning; flag ambiguities.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 800,
    });
    const translated = resp.choices[0].message.content || "";
    return { translated, warnings };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`Translation failed: ${message}`);
    return { translated: "", warnings };
  }
}

