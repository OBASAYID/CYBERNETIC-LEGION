import type { Express, Request, Response } from "express";
import { generateImage, generateImageVariation, editImages, getImageCapabilities } from "./client.js";
import type { ImageModel, ImageSize, ImageQuality, ImageStyle } from "./client.js";
import path from "node:path";
import fs from "node:fs";

function validateImagePath(imagePath: string): string | null {
  const publicDir = path.resolve(process.cwd(), "public");
  const resolved = path.resolve(publicDir, imagePath.replace(/^\//, ""));
  if (!resolved.startsWith(publicDir + path.sep) && resolved !== publicDir) {
    return null;
  }
  if (!fs.existsSync(resolved)) {
    return null;
  }
  return resolved;
}

export function registerImageRoutes(app: Express): void {
  app.post("/api/image/generate", async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        model = "dall-e-3",
        size = "1024x1024",
        quality = "standard",
        style = "vivid",
        save = true,
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      console.log(`[CYRUS Image] Generating: "${prompt.substring(0, 80)}..." model=${model}`);

      const result = await generateImage({
        prompt,
        model: model as ImageModel,
        size: size as ImageSize,
        quality: quality as ImageQuality,
        style: style as ImageStyle,
        savePath: save ? "auto" : undefined,
      });

      res.json(result);
    } catch (error: any) {
      console.error("[CYRUS Image] Generation failed:", error?.message || error);
      res.status(500).json({
        error: "Image generation failed",
        details: error?.message || "Unknown error",
      });
    }
  });

  app.post("/api/image/edit", async (req: Request, res: Response) => {
    try {
      const { imagePath, prompt } = req.body;

      if (!imagePath || !prompt) {
        return res.status(400).json({ error: "imagePath and prompt are required" });
      }

      const fullPath = validateImagePath(imagePath);
      if (!fullPath) {
        return res.status(400).json({ error: "Invalid or non-existent image path. Path must be within /public directory." });
      }
      const outputDir = path.join(process.cwd(), "public", "uploads", "generated");
      const outputFile = path.join(outputDir, `edit-${Date.now()}.png`);

      const buffer = await editImages([fullPath], prompt, outputFile);

      res.json({
        success: true,
        savedPath: `/uploads/generated/${path.basename(outputFile)}`,
        size: buffer.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[CYRUS Image] Edit failed:", error?.message || error);
      res.status(500).json({
        error: "Image editing failed",
        details: error?.message || "Unknown error",
      });
    }
  });

  app.post("/api/image/variation", async (req: Request, res: Response) => {
    try {
      const { imagePath, n = 1, size = "1024x1024" } = req.body;

      if (!imagePath) {
        return res.status(400).json({ error: "imagePath is required" });
      }

      const fullPath = validateImagePath(imagePath);
      if (!fullPath) {
        return res.status(400).json({ error: "Invalid or non-existent image path. Path must be within /public directory." });
      }

      const result = await generateImageVariation({
        imagePath: fullPath,
        n,
        size: size as ImageSize,
        savePath: "auto",
      });

      res.json(result);
    } catch (error: any) {
      console.error("[CYRUS Image] Variation failed:", error?.message || error);
      res.status(500).json({
        error: "Image variation failed",
        details: error?.message || "Unknown error",
      });
    }
  });

  app.get("/api/image/capabilities", (_req: Request, res: Response) => {
    try {
      res.json(getImageCapabilities());
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get capabilities" });
    }
  });

  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "1024x1024", model = "dall-e-3", quality = "standard", style = "vivid" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const result = await generateImage({
        prompt,
        model: model as ImageModel,
        size: size as ImageSize,
        quality: quality as ImageQuality,
        style: style as ImageStyle,
        savePath: "auto",
      });

      const firstImage = result.images[0];
      res.json({
        url: firstImage?.savedPath,
        b64_json: firstImage?.b64_json,
        revised_prompt: firstImage?.revised_prompt,
        model: result.model,
      });
    } catch (error: any) {
      console.error("[CYRUS Image] Legacy generate failed:", error?.message || error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  console.log("[CYRUS Image] Image generation routes registered (DALL-E 3, DALL-E 2, gpt-image-1)");
}
