/**
 * Asset intelligence scoring — heuristics + ridge-calibrated blend for web mining.
 */

import type { AssetDomain } from "../../shared/asset-types.js";
import {
  ASSET_ALGORITHM_VERSION,
  ASSET_FEATURE_NAMES,
  ASSET_SCORE_DIMENSIONS,
  type AssetScoreDimension,
  type AssetScoreVector,
} from "../../shared/asset-intelligence-types.js";
import { applyCalibratedBlend, clamp, type CalibratedModel } from "../../shared/ml-calibration.js";
import { loadAssetModel } from "./asset-model.js";

export { ASSET_ALGORITHM_VERSION, ASSET_FEATURE_NAMES, ASSET_SCORE_DIMENSIONS };
export type { AssetScoreDimension, AssetScoreVector };

export type AssetCandidateSignals = {
  url: string;
  title: string;
  query: string;
  domain: AssetDomain;
  tags: string[];
  kind: "image" | "model_3d";
  bytes?: number;
  license?: string;
  attribution?: string;
  sourceHost: string;
};

const TRUSTED_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "cdn.jsdelivr.net",
  "raw.githubusercontent.com",
  "nih.gov",
  "cdc.gov",
  "nasa.gov",
  "edu",
]);

function hostTrust(host: string): number {
  if (host.includes("wikimedia")) return 1;
  if (host.endsWith(".edu") || host.endsWith(".gov")) return 0.9;
  if (TRUSTED_HOSTS.has(host)) return 0.85;
  if (host.includes("github")) return 0.75;
  return 0.45;
}

function termOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  const tb = new Set(b.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.max(ta.size, tb.size);
}

export function extractAssetFeatures(signals: AssetCandidateSignals): number[] {
  const hay = `${signals.url} ${signals.title} ${signals.tags.join(" ")}`.toLowerCase();
  const qOverlap = termOverlap(signals.query, hay);
  const domainWords: Record<AssetDomain, string[]> = {
    anatomy: ["anatomy", "heart", "brain", "muscle", "bone", "organ"],
    health: ["medical", "clinical", "patient", "hospital"],
    military: ["military", "tactical", "defense", "army"],
    education: ["education", "student", "learning", "school"],
    engineering: ["engineering", "cad", "schematic", "3d"],
    science: ["science", "research", "lab", "physics"],
    communication: ["network", "communication", "comms"],
    general: [],
  };

  const domainMatch = domainWords[signals.domain].some((w) => hay.includes(w)) ? 1 : 0.3;

  return [
    clamp(qOverlap, 0, 1),
    domainMatch,
    signals.sourceHost.includes("wikimedia") || signals.url.includes("wikimedia") ? 1 : 0,
    signals.license ? 1 : 0,
    signals.attribution ? 1 : 0,
    clamp(signals.tags.length / 6, 0, 1),
    clamp(signals.title.length / 80, 0, 1),
    clamp((signals.bytes ?? 200_000) / 5_000_000, 0, 1),
    signals.kind === "model_3d" ? 1 : 0,
    hay.includes(".png") ? 1 : 0,
    hay.includes(".svg") ? 1 : 0,
    hay.includes(".jpg") || hay.includes(".jpeg") ? 1 : 0,
    hostTrust(signals.sourceHost),
    signals.sourceHost.endsWith(".edu") ? 1 : 0,
    signals.sourceHost.endsWith(".gov") ? 1 : 0,
    domainWords.anatomy.some((w) => hay.includes(w)) ? 1 : 0,
    domainWords.engineering.some((w) => hay.includes(w)) ? 1 : 0,
    domainWords.science.some((w) => hay.includes(w)) ? 1 : 0,
  ];
}

export function heuristicAssetScores(signals: AssetCandidateSignals): AssetScoreVector {
  const features = extractAssetFeatures(signals);
  const trust = features[12] * 100;
  const relevance = clamp(features[0] * 70 + features[1] * 30);
  const educational = clamp(40 + features[15] * 25 + features[16] * 15 + features[2] * 20);
  const visual = clamp(50 + (signals.kind === "image" ? 25 : 10) + features[9] * 10 + features[10] * 5);
  const license = clamp(35 + features[3] * 35 + features[4] * 20 + features[2] * 10);
  const domainFit = clamp(features[1] * 60 + features[0] * 40);
  const technical = clamp(45 + features[7] * 30 + (signals.kind === "model_3d" ? 20 : 10));
  const priority = clamp(relevance * 0.35 + trust * 0.25 + educational * 0.2 + license * 0.2);
  const overall = clamp(
    relevance * 0.2 + trust * 0.15 + educational * 0.15 + visual * 0.1 + license * 0.15 + domainFit * 0.15 + technical * 0.1,
  );

  return {
    relevance,
    source_trust: trust,
    educational_value: educational,
    visual_clarity: visual,
    license_safety: license,
    domain_fit: domainFit,
    technical_quality: technical,
    retrieval_priority: priority,
    overall_quality: overall,
  };
}

export function vectorizeAssetScores(scores: AssetScoreVector): number[] {
  return ASSET_SCORE_DIMENSIONS.map((d) => scores[d]);
}

export function scoreAssetCandidate(
  signals: AssetCandidateSignals,
  model?: CalibratedModel | null,
): AssetScoreVector {
  const heuristic = heuristicAssetScores(signals);
  const m = model ?? loadAssetModel();
  if (!m) return heuristic;
  const features = extractAssetFeatures(signals);
  const blended = applyCalibratedBlend(vectorizeAssetScores(heuristic), features, m);
  const out = { ...heuristic };
  ASSET_SCORE_DIMENSIONS.forEach((d, i) => {
    out[d] = blended[i] ?? heuristic[d];
  });
  return out;
}

export function rankAssetCandidates<T extends { url: string; title?: string }>(
  candidates: T[],
  query: string,
  domain: AssetDomain,
  tags: string[],
  minPriority = 45,
): Array<T & { mlScores: AssetScoreVector; mlPriority: number }> {
  const model = loadAssetModel();
  const ranked = candidates.map((c) => {
    let sourceHost = "";
    try {
      sourceHost = new URL(c.url).hostname;
    } catch { /* skip */ }
    const kind = c.url.match(/\.(glb|gltf|obj|stl)/i) ? "model_3d" as const : "image" as const;
    const scores = scoreAssetCandidate(
      {
        url: c.url,
        title: c.title || query,
        query,
        domain,
        tags,
        kind,
        sourceHost,
      },
      model,
    );
    return { ...c, mlScores: scores, mlPriority: scores.retrieval_priority };
  });
  return ranked.filter((r) => r.mlPriority >= minPriority).sort((a, b) => b.mlPriority - a.mlPriority);
}
