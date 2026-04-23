import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { toFile } from "openai";
import { localImageGen } from "./local-image-client.js";

const getApiKey = () => process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

// Use local image generation as primary, OpenAI as fallback
const useLocalImageGen = process.env.USE_LOCAL_IMAGE_GEN !== 'false';

export const openai = useLocalImageGen ? null : (getApiKey() ? new (await import("openai")).default({
  apiKey: getApiKey(),
}) : null);

async function getClient() {
  if (useLocalImageGen) {
    return null; // Will use localImageGen instead
  }

  const key = getApiKey();
  if (!key) {
    throw new Error("OpenAI API key not configured and local image generation disabled. Set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY, or set USE_LOCAL_IMAGE_GEN=true.");
  }
  const openai = await import("openai");
  return new openai.default({
    apiKey: key,
  });
}

export type ImageSize = "1024x1024" | "1024x1792" | "1792x1024" | "512x512" | "256x256";
export type ImageQuality = "standard" | "hd";
export type ImageStyle = "natural" | "vivid";
export type ImageModel = "dall-e-3" | "dall-e-2" | "gpt-image-1";

export interface ImageGenerationOptions {
  prompt: string;
  model?: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  n?: number;
  savePath?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  model: string;
  prompt: string;
  size: string;
  quality: string;
  style: string;
  images: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
    savedPath?: string;
  }>;
  timestamp: string;
}

export interface ImageVariationOptions {
  imagePath: string;
  n?: number;
  size?: ImageSize;
  savePath?: string;
}

export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  // Try local image generation first
  if (useLocalImageGen) {
    try {
      console.log(`[Local Image Gen] Generating image with prompt: ${options.prompt}`);

      const localResult = await localImageGen.generate({
        prompt: options.prompt,
        width: options.size ? parseInt(options.size.split('x')[0]) : 512,
        height: options.size ? parseInt(options.size.split('x')[1]) : 512,
        steps: 20,
        guidance: 7.5,
        outputPath: options.savePath
      });

      if (localResult.success && localResult.imagePath) {
        // Read the generated image and convert to base64
        const imageBuffer = fs.readFileSync(localResult.imagePath);
        const b64_json = imageBuffer.toString('base64');

        return {
          success: true,
          model: "stable-diffusion-v1-5",
          prompt: options.prompt,
          size: `${localResult.metadata?.width || 512}x${localResult.metadata?.height || 512}`,
          quality: "standard",
          style: "natural",
          images: [{
            b64_json,
            savedPath: options.savePath ? `/uploads/generated/${path.basename(localResult.imagePath)}` : undefined
          }],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn("[LocalImageGen] Failed, falling back to OpenAI:", error);
    }
  }

  // Fallback to OpenAI
  const client = await getClient();
  if (!client) {
    throw new Error("No image generation service available. Configure OpenAI or enable local image generation.");
  }

  const model = options.model || "dall-e-3";
  const size = options.size || "1024x1024";
  const quality = options.quality || "standard";
  const style = options.style || "vivid";
  const n = model === "dall-e-3" ? 1 : (options.n || 1);

  console.log(`[Image Gen] Model: ${model}, Size: ${size}, Quality: ${quality}, Style: ${style}`);

  const params: any = {
    model,
    prompt: options.prompt,
    n,
    size,
  };

  if (model === "dall-e-3") {
    params.quality = quality;
    params.style = style;
    params.response_format = "b64_json";
  } else if (model === "gpt-image-1") {
    params.response_format = undefined;
  } else {
    params.response_format = "b64_json";
  }

  const response = await client.images.generate(params);

  const images = await Promise.all(
    (response.data || []).map(async (img: any, index: number) => {
      const result: any = {
        url: img.url,
        b64_json: img.b64_json,
        revised_prompt: img.revised_prompt,
      };

      if (options.savePath && img.b64_json) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "generated");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filename = `${Date.now()}-${index}.png`;
        const fullPath = path.join(uploadsDir, filename);
        fs.writeFileSync(fullPath, Buffer.from(img.b64_json, "base64"));
        result.savedPath = `/uploads/generated/${filename}`;
      }

      return result;
    })
  );

  return {
    success: true,
    model,
    prompt: options.prompt,
    size,
    quality,
    style,
    images,
    timestamp: new Date().toISOString(),
  };
}

export async function generateImageBuffer(
  prompt: string,
  size: ImageSize = "1024x1024"
): Promise<Buffer> {
  const client = await getClient();
  if (!client) throw new Error("No image generation client available");
  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    size: size as any,
    quality: "standard",
    response_format: "b64_json",
  });
  const imageData = response.data?.[0];
  const base64 = imageData?.b64_json ?? "";
  return Buffer.from(base64, "base64");
}

export async function editImages(
  imageFiles: string[],
  prompt: string,
  outputPath?: string
): Promise<Buffer> {
  const client = await getClient();
  if (!client) throw new Error("No image editing client available");
  const images = await Promise.all(
    imageFiles.map((file) =>
      toFile(fs.createReadStream(file), file, {
        type: "image/png",
      })
    )
  );

  const response = await client.images.edit({
    model: "dall-e-2",
    image: images[0],
    prompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
  });

  const imageResult = response.data?.[0];
  const imageBase64 = imageResult?.b64_json ?? "";
  const imageBytes = Buffer.from(imageBase64, "base64");

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, imageBytes);
  }

  return imageBytes;
}

export async function generateImageVariation(options: ImageVariationOptions): Promise<ImageGenerationResult> {
  const client = await getClient();
  if (!client) throw new Error("No image variation client available");
  const size = options.size || "1024x1024";
  const n = options.n || 1;

  const imageFile = await toFile(fs.createReadStream(options.imagePath), options.imagePath, {
    type: "image/png",
  });

  const response = await client.images.createVariation({
    model: "dall-e-2",
    image: imageFile,
    n,
    size: size as any,
    response_format: "b64_json",
  });

  const images = (response.data || []).map((img: any, index: number) => {
    const result: any = { b64_json: img.b64_json };
    if (options.savePath && img.b64_json) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "generated");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `variation-${Date.now()}-${index}.png`;
      const fullPath = path.join(uploadsDir, filename);
      fs.writeFileSync(fullPath, Buffer.from(img.b64_json, "base64"));
      result.savedPath = `/uploads/generated/${filename}`;
    }
    return result;
  });

  return {
    success: true,
    model: "dall-e-2",
    prompt: "variation",
    size,
    quality: "standard",
    style: "natural",
    images,
    timestamp: new Date().toISOString(),
  };
}

export function getImageCapabilities(): object {
  return {
    models: {
      "dall-e-3": {
        sizes: ["1024x1024", "1024x1792", "1792x1024"],
        qualities: ["standard", "hd"],
        styles: ["natural", "vivid"],
        maxImages: 1,
        features: ["revised_prompt", "high_detail", "style_control"],
      },
      "dall-e-2": {
        sizes: ["256x256", "512x512", "1024x1024"],
        qualities: ["standard"],
        styles: ["natural"],
        maxImages: 10,
        features: ["variations", "editing", "inpainting"],
      },
      "gpt-image-1": {
        sizes: ["1024x1024", "512x512", "256x256"],
        qualities: ["standard"],
        styles: ["natural"],
        maxImages: 1,
        features: ["replit_integration"],
      },
    },
    status: getApiKey() ? "active" : "no_api_key",
    timestamp: new Date().toISOString(),
  };
}
