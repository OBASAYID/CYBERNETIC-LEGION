/**
 * Synthetic asset candidates with known ground-truth quality archetypes.
 */

import { randomBytes } from "crypto";
import {
  ASSET_SCORE_DIMENSIONS,
  type AssetScoreVector,
} from "../../shared/asset-intelligence-types.js";
import type { AssetDomain } from "../../shared/asset-types.js";
import type { AssetCandidateSignals } from "./asset-scoring-core.js";

export type AssetArchetype =
  | "wikimedia_exemplar"
  | "edu_diagram"
  | "clinical_reference"
  | "open_3d_model"
  | "generic_web"
  | "low_trust_icon"
  | "off_domain";

const ARCHETYPE_TRUTH: Record<AssetArchetype, AssetScoreVector> = {
  wikimedia_exemplar: {
    relevance: 92,
    source_trust: 95,
    educational_value: 88,
    visual_clarity: 90,
    license_safety: 94,
    domain_fit: 90,
    technical_quality: 85,
    retrieval_priority: 93,
    overall_quality: 91,
  },
  edu_diagram: {
    relevance: 85,
    source_trust: 88,
    educational_value: 90,
    visual_clarity: 82,
    license_safety: 75,
    domain_fit: 86,
    technical_quality: 80,
    retrieval_priority: 86,
    overall_quality: 84,
  },
  clinical_reference: {
    relevance: 88,
    source_trust: 90,
    educational_value: 86,
    visual_clarity: 84,
    license_safety: 80,
    domain_fit: 88,
    technical_quality: 82,
    retrieval_priority: 87,
    overall_quality: 85,
  },
  open_3d_model: {
    relevance: 80,
    source_trust: 82,
    educational_value: 78,
    visual_clarity: 75,
    license_safety: 85,
    domain_fit: 80,
    technical_quality: 88,
    retrieval_priority: 82,
    overall_quality: 81,
  },
  generic_web: {
    relevance: 55,
    source_trust: 50,
    educational_value: 48,
    visual_clarity: 52,
    license_safety: 40,
    domain_fit: 50,
    technical_quality: 55,
    retrieval_priority: 50,
    overall_quality: 50,
  },
  low_trust_icon: {
    relevance: 25,
    source_trust: 20,
    educational_value: 15,
    visual_clarity: 30,
    license_safety: 25,
    domain_fit: 20,
    technical_quality: 35,
    retrieval_priority: 22,
    overall_quality: 24,
  },
  off_domain: {
    relevance: 35,
    source_trust: 45,
    educational_value: 30,
    visual_clarity: 40,
    license_safety: 35,
    domain_fit: 25,
    technical_quality: 50,
    retrieval_priority: 30,
    overall_quality: 35,
  },
};

const ARCHETYPES = Object.keys(ARCHETYPE_TRUTH) as AssetArchetype[];

function pickArchetype(): AssetArchetype {
  const r = randomBytes(1)[0] / 255;
  if (r < 0.22) return "wikimedia_exemplar";
  if (r < 0.38) return "edu_diagram";
  if (r < 0.5) return "clinical_reference";
  if (r < 0.6) return "open_3d_model";
  if (r < 0.78) return "generic_web";
  if (r < 0.9) return "low_trust_icon";
  return "off_domain";
}

function archetypeSignals(archetype: AssetArchetype): Partial<AssetCandidateSignals> {
  switch (archetype) {
    case "wikimedia_exemplar":
      return {
        url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Heart_diagram.png",
        title: "Human heart anatomy diagram labeled",
        sourceHost: "upload.wikimedia.org",
        license: "CC BY-SA",
        attribution: "Wikimedia Commons",
        tags: ["heart", "anatomy", "cardiovascular"],
        kind: "image",
        bytes: 450_000,
      };
    case "edu_diagram":
      return {
        url: "https://biology.university.edu/diagrams/cell-structure.png",
        title: "Cell structure educational diagram",
        sourceHost: "biology.university.edu",
        tags: ["cell", "education", "biology"],
        kind: "image",
        bytes: 320_000,
      };
    case "clinical_reference":
      return {
        url: "https://www.nih.gov/images/lung-anatomy-reference.jpg",
        title: "Respiratory system clinical reference",
        sourceHost: "www.nih.gov",
        license: "Public domain",
        tags: ["lung", "respiratory", "clinical"],
        kind: "image",
        bytes: 280_000,
      };
    case "open_3d_model":
      return {
        url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb",
        title: "BrainStem 3D anatomy model",
        sourceHost: "cdn.jsdelivr.net",
        license: "Khronos Sample",
        tags: ["3d", "brain", "anatomy"],
        kind: "model_3d",
        bytes: 3_200_000,
      };
    case "low_trust_icon":
      return {
        url: "https://cdn.example.com/favicon-16x16.png",
        title: "favicon",
        sourceHost: "cdn.example.com",
        tags: ["icon"],
        kind: "image",
        bytes: 2048,
      };
    case "off_domain":
      return {
        url: "https://random-blog.net/unrelated-photo.jpg",
        title: "Vacation photo",
        sourceHost: "random-blog.net",
        tags: ["travel"],
        kind: "image",
        bytes: 150_000,
      };
    default:
      return {
        url: "https://example.org/generic-illustration.png",
        title: "Generic illustration",
        sourceHost: "example.org",
        tags: ["general"],
        kind: "image",
        bytes: 180_000,
      };
  }
}

export function generateSimulatedAsset(): {
  signals: AssetCandidateSignals;
  archetype: AssetArchetype;
} {
  const archetype = pickArchetype();
  const partial = archetypeSignals(archetype);
  const domains: AssetDomain[] = ["anatomy", "health", "education", "engineering", "science", "military", "communication", "general"];
  const domain = domains[randomBytes(1)[0] % domains.length];
  const query = partial.title || "anatomy diagram";

  const signals: AssetCandidateSignals = {
    url: partial.url || "https://example.org/asset.png",
    title: partial.title || query,
    query,
    domain,
    tags: partial.tags || ["general"],
    kind: partial.kind || "image",
    bytes: partial.bytes,
    license: partial.license,
    attribution: partial.attribution,
    sourceHost: partial.sourceHost || "example.org",
  };

  return { signals, archetype };
}

export function groundTruthVector(archetype: AssetArchetype): number[] {
  return ASSET_SCORE_DIMENSIONS.map((d) => ARCHETYPE_TRUTH[archetype][d]);
}

export { ARCHETYPE_TRUTH, ARCHETYPES };
