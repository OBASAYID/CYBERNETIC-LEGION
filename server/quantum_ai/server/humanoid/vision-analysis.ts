import { Router, Request, Response } from "express";
import { localVision } from "../scan/local-vision-client";

const router = Router();

const useLocalVision = process.env.USE_LOCAL_VISION !== 'false';

async function getOpenAIClient(): Promise<any | null> {
  if (!useLocalVision) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (!apiKey) return null;
    const openai = await import("openai");
    return new openai.default({ apiKey, baseURL });
  }
  return null;
}

interface PersonAnalysis {
  id: number;
  gender: string;
  ageRange: string;
  description: string;
  isRecognized: boolean;
  name?: string;
}

const knownFaces: Map<string, { name: string; role: string }> = new Map();

const analysisTimestamps: Map<string, number> = new Map();
const RATE_LIMIT_MS = 3000;
const MAX_IMAGE_SIZE = 500000;

router.post("/analyze-people", async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Image data required" });
    }

    const clientIP = req.ip || "unknown";
    const lastAnalysis = analysisTimestamps.get(clientIP) || 0;
    const now = Date.now();
    if (now - lastAnalysis < RATE_LIMIT_MS) {
      return res.status(429).json({ error: "Rate limited", retryAfter: RATE_LIMIT_MS });
    }
    analysisTimestamps.set(clientIP, now);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    if (base64Data.length > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: "Image too large" });
    }

    const client = await getOpenAIClient();
    if (!client) {
      return res.status(500).json({ error: "Vision API not configured" });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are CYRUS's vision system. Analyze the image and identify all visible people.
For each person, provide:
- gender: "Male", "Female", or "Unknown"
- ageRange: estimated age range like "20-30", "30-40", etc.
- description: brief physical description (clothing, hair, notable features)

Return JSON format:
{
  "peopleCount": number,
  "persons": [
    {
      "id": 1,
      "gender": "Male/Female/Unknown",
      "ageRange": "20-30",
      "description": "Brief description"
    }
  ]
}

If no people are visible, return {"peopleCount": 0, "persons": []}.
Be professional and respectful in descriptions.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: "Analyze all people visible in this image. Provide count, gender, age estimate, and brief description for each.",
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    let result: { peopleCount: number; persons: PersonAnalysis[] };
    try {
      result = JSON.parse(response.choices[0].message.content || '{"peopleCount": 0, "persons": []}');
    } catch {
      result = { peopleCount: 0, persons: [] };
    }

    result.persons = result.persons.map((person) => ({
      ...person,
      isRecognized: false,
    }));

    res.json(result);
  } catch (error: any) {
    console.error("[Vision] Analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/register-face", async (req: Request, res: Response) => {
  try {
    const { name, role, faceId } = req.body;
    if (!name || !faceId) {
      return res.status(400).json({ error: "Name and faceId required" });
    }
    knownFaces.set(faceId, { name, role: role || "User" });
    res.json({ success: true, message: `Registered ${name}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/known-faces", (req: Request, res: Response) => {
  const faces = Array.from(knownFaces.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));
  res.json({ faces });
});

export default router;

console.log("[Vision Analysis] People detection system initialized");
