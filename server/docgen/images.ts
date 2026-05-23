import { generateImage } from "../replit_integrations/image/client.js";
import { assetToDataUrl, resolveWebAssets } from "../assets/asset-resolver.js";

type ImageStyle = "realistic_3d" | "graphical" | "schematic";

export type DocImageAttachment = {
  id: string;
  kind: "image";
  style: ImageStyle;
  sectionTitle?: string;
  caption: string;
  prompt: string;
  url?: string;
  dataUrl?: string;
};

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  realistic_3d: "Realistic 3D educational illustration, clean lighting, neutral background, professional textbook quality.",
  graphical: "Clean flat vector infographic style, high contrast, labeled where appropriate, educational.",
  schematic: "Schematic anatomical/educational diagram with clear labels, neutral colors, no gore, textbook reference style.",
};

function mapStyleToDalle(style: ImageStyle): "natural" | "vivid" {
  return style === "realistic_3d" ? "vivid" : "natural";
}

function buildImagePrompt(brief: string, sectionTitle: string, topic: string, style: ImageStyle): string {
  return [
    STYLE_PROMPTS[style],
    `Subject: ${topic}.`,
    `Section focus: ${sectionTitle}.`,
    brief,
    "No watermarks, no logos, suitable for professional document embedding.",
  ].join(" ");
}

export async function generateDocAttachments(input: {
  includeImages?: boolean;
  imageStyle?: ImageStyle;
  topic: string;
  graphicsPlan: Array<{ sectionTitle: string; assetType: string; placement: string; brief: string }>;
  maxImages?: number;
}): Promise<DocImageAttachment[]> {
  if (!input.includeImages) return [];

  const style = input.imageStyle || "schematic";
  const plans = (input.graphicsPlan || []).slice(0, input.maxImages ?? 4);
  const attachments: DocImageAttachment[] = [];

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const searchQuery = `${input.topic} ${plan.sectionTitle} ${plan.brief}`.slice(0, 200);
    const prompt = buildImagePrompt(plan.brief, plan.sectionTitle, input.topic, style);

    try {
      const webAssets = await resolveWebAssets({
        query: searchQuery,
        kind: "image",
        limit: 1,
        fetchIfMissing: true,
      });
      const web = webAssets[0];
      if (web) {
        attachments.push({
          id: `img_${Date.now()}_${i}`,
          kind: "image",
          style,
          sectionTitle: plan.sectionTitle,
          caption: `${plan.sectionTitle} — ${plan.assetType}${web.attribution ? ` (${web.attribution})` : ""}`,
          prompt: web.title || searchQuery,
          url: web.publicPath,
          dataUrl: assetToDataUrl(web),
        });
        continue;
      }

      const result = await generateImage({
        prompt,
        model: "dall-e-3",
        style: mapStyleToDalle(style),
        size: "1024x1024",
      });
      const img = result.images?.[0];
      if (!img) continue;

      const dataUrl = img.b64_json
        ? `data:image/png;base64,${img.b64_json}`
        : img.url;

      attachments.push({
        id: `img_${Date.now()}_${i}`,
        kind: "image",
        style,
        sectionTitle: plan.sectionTitle,
        caption: `${plan.sectionTitle} — ${plan.assetType}`,
        prompt: img.revised_prompt || prompt,
        url: img.url,
        dataUrl,
      });
    } catch (err) {
      console.warn(`[Docgen] Image attach failed for ${plan.sectionTitle}:`, err);
    }
  }

  return attachments;
}
