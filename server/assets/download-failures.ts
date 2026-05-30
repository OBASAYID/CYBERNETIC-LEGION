import fs from "fs";
import path from "path";
import { ASSET_ROOT } from "./asset-registry.js";
import type { AssetDomain } from "../../shared/asset-types.js";

export type FailedDownloadEntry = {
  url: string;
  title?: string;
  domain?: AssetDomain;
  tags?: string[];
  license?: string;
  attribution?: string;
  error: string;
  attempts: number;
  lastAttempt: string;
  resolved: boolean;
};

export const FAILED_DOWNLOADS_PATH = path.join(ASSET_ROOT, "failed-downloads.jsonl");

function ensureRoot(): void {
  if (!fs.existsSync(ASSET_ROOT)) fs.mkdirSync(ASSET_ROOT, { recursive: true });
}

export function loadFailedDownloads(includeResolved = false): FailedDownloadEntry[] {
  ensureRoot();
  if (!fs.existsSync(FAILED_DOWNLOADS_PATH)) return [];
  const raw = fs
    .readFileSync(FAILED_DOWNLOADS_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as FailedDownloadEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is FailedDownloadEntry => Boolean(e));

  const byUrl = new Map<string, FailedDownloadEntry>();
  for (const entry of raw) {
    const prev = byUrl.get(entry.url);
    if (!prev || entry.lastAttempt >= prev.lastAttempt) byUrl.set(entry.url, entry);
  }

  return [...byUrl.values()].filter((e) => includeResolved || !e.resolved);
}

export function recordFailedDownload(entry: Omit<FailedDownloadEntry, "attempts" | "lastAttempt" | "resolved"> & { attempts?: number }): void {
  ensureRoot();
  const existing = loadFailedDownloads(true).find((e) => e.url === entry.url && !e.resolved);
  const record: FailedDownloadEntry = {
    ...entry,
    attempts: (existing?.attempts ?? 0) + 1,
    lastAttempt: new Date().toISOString(),
    resolved: false,
  };
  fs.appendFileSync(FAILED_DOWNLOADS_PATH, `${JSON.stringify(record)}\n`);
}

export function markDownloadResolved(url: string): void {
  const all = loadFailedDownloads(true);
  if (!all.some((e) => e.url === url && !e.resolved)) return;
  ensureRoot();
  const updated = all.map((e) => (e.url === url ? { ...e, resolved: true, lastAttempt: new Date().toISOString() } : e));
  fs.writeFileSync(FAILED_DOWNLOADS_PATH, updated.map((e) => JSON.stringify(e)).join("\n") + (updated.length ? "\n" : ""));
}

export function getFailedDownloadStats() {
  const pending = loadFailedDownloads(false);
  return { pending: pending.length, urls: pending.map((e) => e.url) };
}
