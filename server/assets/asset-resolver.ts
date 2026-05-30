/**
 * Resolve prompts to locally cached web assets — OpenAI-free path.
 */

import fs from "fs";
import type { AssetDomain, AssetRecord } from "../../shared/asset-types.js";
import { getAssetFilePath, inferDomain, loadAssetRegistry, searchAssets } from "./asset-registry.js";
import { downloadAndRegisterAsset, searchWikimediaImages } from "./asset-downloader.js";

export function isOpenAiIndependentMode(): boolean {
  return (
    process.env.CYRUS_OPENAI_INDEPENDENT === "true" ||
    process.env.CYRUS_NO_OPENAI === "true" ||
    process.env.USE_LOCAL_IMAGE_GEN === "true"
  );
}

export function assetToDataUrl(asset: AssetRecord): string | undefined {
  try {
    const buf = fs.readFileSync(getAssetFilePath(asset.localPath));
    const mime = asset.mimeType || "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function resolveWebAssets(input: {
  query: string;
  kind?: "image" | "model_3d";
  domain?: AssetDomain;
  limit?: number;
  fetchIfMissing?: boolean;
}): Promise<AssetRecord[]> {
  const domain = inferDomain(input.query, input.domain);
  const kind = input.kind || "image";
  const limit = input.limit ?? 3;

  let hits = searchAssets(input.query, { kind, domain, limit });

  if (hits.length < limit && input.fetchIfMissing !== false) {
    const urls = await searchWikimediaImages(`${input.query} ${domain}`, limit - hits.length);
    for (const url of urls) {
      await downloadAndRegisterAsset({
        url,
        title: input.query,
        domain,
        tags: input.query.toLowerCase().split(/\s+/).slice(0, 6),
        license: "Wikimedia Commons",
        attribution: "Wikimedia Commons",
      });
    }
    hits = searchAssets(input.query, { kind, domain, limit });
  }

  return hits.map((h) => h.asset);
}

export async function resolveBestImage(query: string, domain?: AssetDomain): Promise<AssetRecord | null> {
  const assets = await resolveWebAssets({ query, kind: "image", domain, limit: 1 });
  return assets[0] || null;
}

export function listAssetsByDomain(domain: AssetDomain, limit = 20): AssetRecord[] {
  return loadAssetRegistry().filter((a) => a.domain === domain).slice(0, limit);
}
