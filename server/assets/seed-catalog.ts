/** Curated open-web seed queries — no API keys required. */

import type { AssetDomain } from "../../shared/asset-types.js";

export type SeedQuery = {
  query: string;
  domain: AssetDomain;
  tags: string[];
  preferWikimedia?: boolean;
};

export const ASSET_SEED_QUERIES: SeedQuery[] = [
  { query: "human heart anatomy diagram", domain: "anatomy", tags: ["heart", "cardiovascular"], preferWikimedia: true },
  { query: "human brain anatomy labeled", domain: "anatomy", tags: ["brain", "neuroscience"], preferWikimedia: true },
  { query: "skeletal system anatomy", domain: "anatomy", tags: ["skeleton", "bone"], preferWikimedia: true },
  { query: "muscular system anatomy", domain: "anatomy", tags: ["muscle"], preferWikimedia: true },
  { query: "respiratory system lungs diagram", domain: "health", tags: ["lung", "respiratory"], preferWikimedia: true },
  { query: "medical stethoscope clinical", domain: "health", tags: ["clinical"], preferWikimedia: true },
  { query: "military tactical map symbols", domain: "military", tags: ["tactical", "map"] },
  { query: "education classroom learning", domain: "education", tags: ["classroom", "student"] },
  { query: "engineering schematic diagram", domain: "engineering", tags: ["schematic", "cad"] },
  { query: "science laboratory research", domain: "science", tags: ["lab", "research"] },
  { query: "global communication network", domain: "communication", tags: ["network", "comms"] },
  { query: "glb 3d model anatomy", domain: "anatomy", tags: ["3d", "model"] },
  { query: "open source gltf sample model", domain: "engineering", tags: ["gltf", "3d"] },
  { query: "machine learning pipeline diagram", domain: "science", tags: ["ml", "pipeline"], preferWikimedia: true },
  { query: "database schema entity relationship diagram", domain: "engineering", tags: ["database", "schema"] },
  { query: "network topology diagram", domain: "communication", tags: ["network", "topology"], preferWikimedia: true },
  { query: "surgical instruments medical diagram", domain: "health", tags: ["surgery", "instruments"], preferWikimedia: true },
  { query: "military rank insignia chart", domain: "military", tags: ["rank", "insignia"], preferWikimedia: true },
  { query: "periodic table elements chart", domain: "science", tags: ["chemistry", "elements"], preferWikimedia: true },
  { query: "solar system planets diagram", domain: "science", tags: ["astronomy", "planets"], preferWikimedia: true },
];

export type OpenModelEntry = {
  url: string;
  mirrors?: string[];
  title: string;
  domain: AssetDomain;
  license?: string;
};

/** Direct open 3D model URLs — CDN first, GitHub raw as mirror. */
export const OPEN_MODEL_URLS: OpenModelEntry[] = [
  {
    url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/BrainStem/glTF-Binary/BrainStem.glb",
    mirrors: [
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb",
    ],
    title: "BrainStem GLB sample",
    domain: "anatomy",
    license: "Khronos glTF Sample Models",
  },
  {
    url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    mirrors: [
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    ],
    title: "Damaged Helmet GLB",
    domain: "engineering",
    license: "Khronos glTF Sample Models",
  },
];
