/** CYRUS open asset library — web-sourced images & 3D models (no OpenAI). */

export type AssetKind = "image" | "model_3d" | "document";

export type AssetDomain =
  | "education"
  | "health"
  | "military"
  | "anatomy"
  | "engineering"
  | "science"
  | "communication"
  | "general";

export type AssetRecord = {
  id: string;
  kind: AssetKind;
  sourceUrl: string;
  localPath: string;
  publicPath: string;
  domain: AssetDomain;
  sourceHost: string;
  title: string;
  tags: string[];
  mimeType: string;
  bytes: number;
  ingestedAt: string;
  license?: string;
  attribution?: string;
};

export type AssetSearchResult = {
  asset: AssetRecord;
  score: number;
};
