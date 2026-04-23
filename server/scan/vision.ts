import { localVision } from "./local-vision-client.js";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

// Use local vision as primary, OpenAI as fallback
const useLocalVision = process.env.USE_LOCAL_VISION !== 'false';
let visionClient: any = null;

async function initVisionClient() {
  if (!visionClient && !useLocalVision && openaiApiKey) {
    const OpenAI = (await import("openai")).default;
    visionClient = new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl });
  }
}

export interface VisionResult {
  ocrText: string;
  notes: string;
  warnings: string[];
}

export async function visionOcr(buffer: Buffer): Promise<VisionResult> {
  // Initialize vision client if needed
  await initVisionClient();

  const warnings: string[] = [];

  // Try local vision first
  if (useLocalVision) {
    try {
      const localResult = await localVision.ocr(buffer);
      return {
        ocrText: localResult.ocrText,
        notes: localResult.notes,
        warnings: [...warnings, ...localResult.warnings]
      };
    } catch (error) {
      warnings.push(`Local vision failed: ${error}`);
      console.warn("[LocalVision] OCR failed, falling back to OpenAI:", error);
    }
  }

  // Fallback to OpenAI
  if (!visionClient) {
    warnings.push("Vision not configured (missing OpenAI env and local vision disabled).");
    return { ocrText: "", notes: "Vision unavailable", warnings };
  }
  const b64 = buffer.toString("base64");
  try {
    const resp = await visionClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an OCR and visual analysis tool. Return extracted text and brief notes on layout/objects/stamps. Keep concise and factual.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Perform OCR and brief notes." },
            { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } },
          ],
        },
      ],
      max_tokens: 600,
    });
    const content = resp.choices[0]?.message?.content || "";
    return { ocrText: content, notes: "Vision OCR", warnings };
  } catch (err: any) {
    warnings.push(`Vision call failed: ${err?.message || err}`);
    return { ocrText: "", notes: "Vision failed", warnings };
  }
}

