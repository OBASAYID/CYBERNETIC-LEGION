import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const interpretClient =
  openaiApiKey
    ? new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl })
    : null;

export interface Interpretation {
  interpretation: string;
  keyFindings: string[];
  risks: string[];
  ambiguities: string[];
  warnings: string[];
}

export async function interpretText(text: string): Promise<Interpretation> {
  const warnings: string[] = [];
  if (!interpretClient) {
    warnings.push("Interpretation unavailable (missing OpenAI config).");
    return { interpretation: "Minimal interpretation; LLM not configured.", keyFindings: [], risks: [], ambiguities: [], warnings };
  }
  try {
    const resp = await interpretClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a multilingual intelligence analyst. Provide concise interpretation: key findings, risks/obligations, ambiguities. No fluff.",
        },
        { role: "user", content: text.slice(0, 4000) },
      ],
      max_tokens: 400,
    });
    const content = resp.choices[0].message.content || "";
    // Light parse: split by lines; heuristically classify
    const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
    const keyFindings: string[] = [];
    const risks: string[] = [];
    const ambiguities: string[] = [];
    let interpretation = "";
    for (const l of lines) {
      const lower = l.toLowerCase();
      if (!interpretation && !lower.startsWith("-")) interpretation = l;
      else if (lower.includes("risk")) risks.push(l.replace(/^-+\s*/, ""));
      else if (lower.includes("ambigu")) ambiguities.push(l.replace(/^-+\s*/, ""));
      else keyFindings.push(l.replace(/^-+\s*/, ""));
    }
    return { interpretation, keyFindings, risks, ambiguities, warnings };
  } catch (err: any) {
    warnings.push(`Interpretation failed: ${err?.message || err}`);
    return { interpretation: "Interpretation failed", keyFindings: [], risks: [], ambiguities: [], warnings };
  }
}

