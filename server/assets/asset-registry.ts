import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { AssetDomain, AssetKind, AssetRecord, AssetSearchResult } from "../../shared/asset-types.js";

export const ASSET_ROOT = path.join(process.cwd(), "data", "assets");
export const ASSET_FILES_DIR = path.join(ASSET_ROOT, "files");
export const ASSET_REGISTRY_PATH = path.join(ASSET_ROOT, "registry.jsonl");

let cache: AssetRecord[] | undefined;

function ensureDirs(): void {
  if (!fs.existsSync(ASSET_FILES_DIR)) fs.mkdirSync(ASSET_FILES_DIR, { recursive: true });
}

export function loadAssetRegistry(force = false): AssetRecord[] {
  if (!force && cache) return cache;
  ensureDirs();
  if (!fs.existsSync(ASSET_REGISTRY_PATH)) {
    cache = [];
    return cache;
  }
  const lines = fs.readFileSync(ASSET_REGISTRY_PATH, "utf8").split("\n").filter(Boolean);
  cache = lines
    .map((line) => {
      try {
        return JSON.parse(line) as AssetRecord;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as AssetRecord[];
  return cache;
}

export function appendAssetRecord(record: AssetRecord): void {
  ensureDirs();
  fs.appendFileSync(ASSET_REGISTRY_PATH, `${JSON.stringify(record)}\n`);
  cache = undefined;
}

export function saveAssetFile(buffer: Buffer, ext: string): string {
  ensureDirs();
  const id = crypto.randomBytes(12).toString("hex");
  const filename = `${id}${ext}`;
  fs.writeFileSync(path.join(ASSET_FILES_DIR, filename), buffer);
  return filename;
}

export function getAssetFilePath(localPath: string): string {
  return path.join(ASSET_FILES_DIR, localPath);
}

export function searchAssets(
  query: string,
  options: { kind?: AssetKind; domain?: AssetDomain; limit?: number } = {},
): AssetSearchResult[] {
  const q = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const records = loadAssetRegistry();
  const results: AssetSearchResult[] = [];

  for (const asset of records) {
    if (options.kind && asset.kind !== options.kind) continue;
    if (options.domain && asset.domain !== options.domain) continue;

    const hay = `${asset.title} ${asset.tags.join(" ")} ${asset.domain} ${asset.sourceHost}`.toLowerCase();
    let score = 0;
    for (const term of q) {
      if (hay.includes(term)) score += 5;
    }
    if (asset.tags.some((t) => q.some((term) => t.includes(term)))) score += 3;
    if (score > 0) results.push({ asset, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, options.limit ?? 12);
}

export function getAssetStats() {
  const records = loadAssetRegistry();
  const byKind: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  let totalBytes = 0;
  for (const r of records) {
    byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
    totalBytes += r.bytes;
  }
  return { total: records.length, byKind, byDomain, totalBytes };
}

export function inferDomain(query: string, hint?: AssetDomain): AssetDomain {
  if (hint) return hint;
  const lower = query.toLowerCase();
  const entries: [AssetDomain, string[]][] = [
    ["anatomy", ["anatomy", "heart", "lung", "brain", "muscle", "bone", "organ", "cardiovascular"]],
    ["health", ["medical", "clinical", "patient", "hospital", "medicine"]],
    ["military", ["military", "tactical", "defense", "army", "naval", "strategy"]],
    ["education", ["student", "education", "learning", "school"]],
    ["engineering", ["cad", "3d", "engineering", "schematic"]],
    ["science", ["research", "science", "physics", "chemistry"]],
  ];
  for (const [domain, keys] of entries) {
    if (keys.some((k) => lower.includes(k))) return domain;
  }
  return "general";
}
