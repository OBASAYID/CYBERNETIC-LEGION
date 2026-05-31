/** Pshare Studio — story/clip composition, polish presets, and smart advise. */

export type PsharePolishPreset = "cinematic" | "vibrant" | "clean" | "cyrus-bold" | "natural";

export type PshareStudioMode = "clip" | "story";

export type PshareStudioTransition = "crossfade" | "slide" | "zoom";

export type PshareStudioSlide = {
  localId: string;
  kind: "image" | "video";
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  /** Per-slide hold time when no soundtrack length is known */
  durationSec?: number;
};

export type PshareStudioManifest = {
  mode: PshareStudioMode;
  aspect: "9:16" | "1:1" | "16:9";
  slides: PshareStudioSlide[];
  audioUrl?: string | null;
  audioFileName?: string | null;
  polishPreset: PsharePolishPreset;
  polishIntensity: number;
  transition: PshareStudioTransition;
  caption?: string;
  clipTrimStartSec?: number;
  clipTrimEndSec?: number;
  renderedDurationSec?: number;
};

export type PshareStudioAdvice = {
  summary: string;
  recommendedPreset: PsharePolishPreset;
  recommendedTransition: PshareStudioTransition;
  recommendedIntensity: number;
  slideDurationSec: number;
  aspect: PshareStudioManifest["aspect"];
  tips: string[];
  score: number;
};

export const PSHARE_POLISH_PRESETS: Record<
  PsharePolishPreset,
  { label: string; filter: string; description: string }
> = {
  cinematic: {
    label: "Cinematic",
    filter: "contrast(1.12) saturate(0.92) brightness(0.94)",
    description: "Film-grade contrast with muted highlights",
  },
  vibrant: {
    label: "Vibrant",
    filter: "contrast(1.08) saturate(1.35) brightness(1.04)",
    description: "Punchy colour for social feeds",
  },
  clean: {
    label: "Clean",
    filter: "contrast(1.05) saturate(1.05) brightness(1.02)",
    description: "Neutral polish — minimal touch",
  },
  "cyrus-bold": {
    label: "CYRUS Bold",
    filter: "contrast(1.18) saturate(1.22) brightness(0.98) sepia(0.08) hue-rotate(-8deg)",
    description: "Aggressive crimson-grade social look",
  },
  natural: {
    label: "Natural",
    filter: "contrast(1.02) saturate(1.08) brightness(1.01)",
    description: "True-to-life with light lift",
  },
};

export function polishCssFilter(
  preset: PsharePolishPreset,
  intensity: number,
): string {
  const base = PSHARE_POLISH_PRESETS[preset]?.filter ?? PSHARE_POLISH_PRESETS.clean.filter;
  const t = Math.max(0, Math.min(100, intensity)) / 100;
  if (t >= 0.98) return base;
  if (t <= 0.05) return "none";
  return `opacity(${0.85 + t * 0.15}) ${base}`;
}

export function adviseStudioProject(input: {
  mode: PshareStudioMode;
  slideCount: number;
  audioDurationSec?: number;
  imageCount: number;
  videoCount: number;
}): PshareStudioAdvice {
  const { mode, slideCount, audioDurationSec, imageCount, videoCount } = input;
  const tips: string[] = [];
  let recommendedPreset: PsharePolishPreset = "clean";
  let recommendedTransition: PshareStudioTransition = "crossfade";
  let recommendedIntensity = 62;
  let aspect: PshareStudioManifest["aspect"] = mode === "story" ? "9:16" : "9:16";
  let slideDurationSec = 3.5;

  if (audioDurationSec && slideCount > 0) {
    slideDurationSec = Math.max(2, Math.min(6, audioDurationSec / slideCount));
    tips.push(`Synced ${slideCount} scenes to your track (~${slideDurationSec.toFixed(1)}s each).`);
  } else if (slideCount > 0) {
    slideDurationSec = slideCount <= 3 ? 4 : slideCount <= 6 ? 3.2 : 2.8;
  }

  if (mode === "story") {
    aspect = "9:16";
    if (videoCount > 0 && imageCount > 0) {
      recommendedPreset = "cyrus-bold";
      recommendedTransition = "zoom";
      recommendedIntensity = 72;
      tips.push("Mixed photo + video story — zoom transitions keep energy high.");
    } else if (videoCount > 0) {
      recommendedPreset = "cinematic";
      recommendedTransition = "slide";
      recommendedIntensity = 68;
      tips.push("Video-heavy story — cinematic grade with slide cuts reads like a reel.");
    } else {
      recommendedPreset = "vibrant";
      recommendedTransition = "crossfade";
      recommendedIntensity = 70;
      tips.push("Photo story — crossfades with vibrant colour pop feel Instagram-native.");
    }
    if (slideCount < 2) tips.push("Add at least 2 scenes for a flowing story.");
    if (slideCount > 12) tips.push("Consider trimming to 8–12 scenes for tighter retention.");
  } else {
    aspect = "9:16";
    recommendedPreset = videoCount > 0 ? "cinematic" : "cyrus-bold";
    recommendedTransition = "slide";
    recommendedIntensity = 65;
    tips.push("Clip mode — vertical 9:16 maximises feed immersion.");
    if (!audioDurationSec) tips.push("Optional: add a soundtrack in Story mode for beat-synced edits.");
  }

  if (audioDurationSec && audioDurationSec > 60) {
    tips.push("Track is long — first 30–45s usually performs best for stories.");
  }

  const score = Math.min(
    100,
    40 +
      Math.min(slideCount, 8) * 5 +
      (audioDurationSec ? 15 : 0) +
      (videoCount + imageCount > 0 ? 10 : 0),
  );

  const summary =
    mode === "story"
      ? `Story blueprint: ${slideCount} scene${slideCount === 1 ? "" : "s"}, ${aspect}, ${recommendedPreset} grade.`
      : `Clip blueprint: ${aspect}, ${recommendedPreset} grade, ready to polish.`;

  return {
    summary,
    recommendedPreset,
    recommendedTransition,
    recommendedIntensity,
    slideDurationSec,
    aspect,
    tips,
    score,
  };
}

export function normalizePostKind(kind?: string | null): string {
  const k = String(kind || "general").toLowerCase();
  if (["clip", "story", "reel", "listing", "live", "general"].includes(k)) return k;
  return "general";
}

export function pshareKindLabel(kind?: string | null): string {
  switch (normalizePostKind(kind)) {
    case "clip":
      return "Clip";
    case "story":
      return "Story";
    case "reel":
      return "Reel";
    case "listing":
      return "Listing";
    case "live":
      return "Live";
    default:
      return "Post";
  }
}
