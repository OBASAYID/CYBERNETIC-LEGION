import axios from "axios";
import crypto from "crypto";
import http from "http";
import https from "https";
import path from "path";
import { computeBackoffDelay } from "../../shared/cyrus-resilience.js";
import { appendAssetRecord, inferDomain, saveAssetFile } from "./asset-registry.js";
import { markDownloadResolved, recordFailedDownload } from "./download-failures.js";
import type { AssetDomain, AssetKind, AssetRecord } from "../../shared/asset-types.js";

const MAX_BYTES = (() => {
  const mb = parseInt(process.env.CYRUS_ASSET_MAX_MB || "50", 10);
  return (Number.isFinite(mb) ? mb : 50) * 1024 * 1024;
})();

const MAX_RETRIES = (() => {
  const n = parseInt(process.env.CYRUS_ASSET_DOWNLOAD_RETRIES || "6", 10);
  return Number.isFinite(n) ? Math.max(1, n) : 6;
})();

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 8, timeout: 180_000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 8, timeout: 180_000 });

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const MODEL_EXT = new Set([".glb", ".gltf", ".obj", ".stl", ".fbx", ".dae", ".usdz"]);

const BASE_HEADERS = {
  "User-Agent": "CYRUS-Asset-Ingest/1.2 (Open Research; resilient)",
  Accept: "image/*,model/*,application/octet-stream,*/*;q=0.8",
  /** Omit Accept-Encoding so axios does not gzip-decompress partial stream resumes. */
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extFromMime(mime: string): string {
  if (mime.includes("jpeg")) return ".jpg";
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("svg")) return ".svg";
  if (mime.includes("gltf")) return ".gltf";
  if (mime.includes("model/gltf")) return ".glb";
  return ".bin";
}

function kindFromUrl(url: string, mime: string): AssetKind {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  if (MODEL_EXT.has(ext)) return "model_3d";
  if (IMAGE_EXT.has(ext)) return "image";
  if (mime.startsWith("image/")) return "image";
  if (url.toLowerCase().match(/\.(glb|gltf|obj|stl)/)) return "model_3d";
  return "image";
}

function isLargeAssetUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return MODEL_EXT.has(path.extname(new URL(url).pathname).toLowerCase()) || lower.includes(".glb") || lower.includes(".gltf");
}

function validateDownload(url: string, buffer: Buffer, mime: string): boolean {
  if (buffer.length < 32) return false;
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  if (ext === ".glb" || mime.includes("gltf-binary")) {
    return buffer.subarray(0, 4).toString("ascii") === "glTF";
  }
  if (ext === ".png") return buffer[0] === 0x89 && buffer[1] === 0x50;
  if (ext === ".jpg" || ext === ".jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (ext === ".gif") return buffer.subarray(0, 3).toString("ascii") === "GIF";
  if (ext === ".webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF";
  if (ext === ".svg" || mime.includes("svg")) return buffer.toString("utf8", 0, Math.min(256, buffer.length)).includes("<svg");
  return buffer.length > 64;
}

async function downloadBufferResilient(url: string): Promise<{ buffer: Buffer; mime: string } | null> {
  const large = isLargeAssetUrl(url);
  let lastError = "unknown";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const timeoutMs = (large ? 180_000 : 60_000) + attempt * 20_000;
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: timeoutMs,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        maxRedirects: 8,
        httpAgent,
        httpsAgent,
        headers: BASE_HEADERS,
        decompress: true,
      });

      const buffer = Buffer.from(response.data);
      const mime = String(response.headers["content-type"] || guessMime(url)).split(";")[0].trim();

      if (!buffer.length) {
        lastError = "empty response";
        continue;
      }
      if (buffer.length > MAX_BYTES) {
        lastError = "file too large";
        continue;
      }
      if (!validateDownload(url, buffer, mime)) {
        lastError = "invalid or incomplete file";
        continue;
      }

      return { buffer, mime };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const permanent = status !== undefined && status >= 400 && status < 500 && status !== 429;
      console.warn(`[Assets] Attempt ${attempt + 1}/${MAX_RETRIES} failed ${url.slice(0, 80)}… (${lastError})`);
      if (permanent) break;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(computeBackoffDelay(attempt, 800, 20_000));
      }
    }
  }

  return null;
}

function guessMime(url: string): string {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".glb") return "model/gltf-binary";
  if (ext === ".gltf") return "model/gltf+json";
  return "application/octet-stream";
}

export async function downloadAndRegisterAsset(input: {
  url: string;
  title?: string;
  domain?: AssetDomain;
  tags?: string[];
  license?: string;
  attribution?: string;
  skipFailureJournal?: boolean;
}): Promise<AssetRecord | null> {
  if (isLowValueAssetUrl(input.url)) return null;

  const downloaded = await downloadBufferResilient(input.url);
  if (!downloaded) {
    if (!input.skipFailureJournal) {
      recordFailedDownload({
        url: input.url,
        title: input.title,
        domain: input.domain,
        tags: input.tags,
        license: input.license,
        attribution: input.attribution,
        error: "exhausted retries",
      });
    }
    return null;
  }

  const { buffer, mime } = downloaded;
  const kind = kindFromUrl(input.url, mime);
  const ext = path.extname(new URL(input.url).pathname) || extFromMime(mime);
  const localPath = saveAssetFile(buffer, ext);
  const sourceHost = new URL(input.url).hostname;
  const id = crypto.createHash("sha256").update(input.url).digest("hex").slice(0, 24);

  const record: AssetRecord = {
    id,
    kind,
    sourceUrl: input.url,
    localPath,
    publicPath: `/api/assets/file/${localPath}`,
    domain: input.domain || inferDomain(input.title || input.url),
    sourceHost,
    title: input.title || path.basename(new URL(input.url).pathname) || "Web asset",
    tags: input.tags || [],
    mimeType: mime,
    bytes: buffer.length,
    ingestedAt: new Date().toISOString(),
    license: input.license,
    attribution: input.attribution,
  };

  appendAssetRecord(record);
  markDownloadResolved(input.url);
  return record;
}

export async function searchWikimediaImages(query: string, limit = 8): Promise<string[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const api =
        "https://commons.wikimedia.org/w/api.php?" +
        new URLSearchParams({
          action: "query",
          format: "json",
          origin: "*",
          generator: "search",
          gsrsearch: query,
          gsrnamespace: "6",
          gsrlimit: String(limit),
          prop: "imageinfo",
          iiprop: "url|mime|extmetadata",
          iiurlwidth: "1024",
        }).toString();

      const { data } = await axios.get(api, { timeout: 25_000, httpAgent, httpsAgent });
      const pages = data?.query?.pages || {};
      const urls: string[] = [];
      for (const page of Object.values(pages) as Array<{ imageinfo?: Array<{ url?: string; thumburl?: string }> }>) {
        const info = page.imageinfo?.[0];
        const u = info?.thumburl || info?.url;
        if (u) urls.push(u);
      }
      return urls;
    } catch {
      if (attempt < 2) await sleep(computeBackoffDelay(attempt, 500, 4000));
    }
  }
  return [];
}

export async function searchWebPageUrls(query: string, limit = 10): Promise<string[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const html = await axios.get("https://html.duckduckgo.com/html/", {
        params: { q: query },
        timeout: 20_000,
        headers: { "User-Agent": BASE_HEADERS["User-Agent"] },
        httpAgent,
        httpsAgent,
      });
      const matches = [...String(html.data).matchAll(/uddg=([^&"]+)/g)];
      const urls = matches
        .map((m) => {
          try {
            return decodeURIComponent(m[1]);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[];
      return [...new Set(urls)].slice(0, limit);
    } catch {
      if (attempt < 2) await sleep(computeBackoffDelay(attempt, 500, 4000));
    }
  }
  return [];
}

export function isLowValueAssetUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("favicon") ||
    lower.includes("/icon") ||
    lower.includes("sprite") ||
    lower.includes("logo-") ||
    /[_-](?:16|32|48|57|76)x(?:16|32|48|57|76)\./.test(lower)
  );
}

export function extractAssetUrlsFromHtml(html: string, baseUrl: string): { images: string[]; models: string[] } {
  const images: string[] = [];
  const models: string[] = [];
  const imgRe = /(?:src|href)=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg))(?:\?[^"']*)?["']/gi;
  const modelRe = /(?:src|href)=["']([^"']+\.(?:glb|gltf|obj|stl|fbx|dae|usdz))(?:\?[^"']*)?["']/gi;

  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    try {
      images.push(new URL(m[1], baseUrl).href);
    } catch { /* skip */ }
  }
  while ((m = modelRe.exec(html))) {
    try {
      models.push(new URL(m[1], baseUrl).href);
    } catch { /* skip */ }
  }
  return {
    images: [...new Set(images)].filter((u) => !isLowValueAssetUrl(u)),
    models: [...new Set(models)],
  };
}
