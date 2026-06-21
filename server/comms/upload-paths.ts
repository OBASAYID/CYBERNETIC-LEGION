import fs from "fs";
import path from "path";

/** Stable on-disk store for comms/Pshare media (override with CYRUS_COMMS_UPLOAD_DIR). */
export function resolveCommsUploadDir(cwd = process.cwd()): string {
  const env = String(process.env.CYRUS_COMMS_UPLOAD_DIR || "").trim();
  const dir = env ? path.resolve(env) : path.join(cwd, "uploads", "comms");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function resolveCommsRecordingsDir(uploadDir = resolveCommsUploadDir()): string {
  const dir = path.join(uploadDir, "recordings");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Extract stored filename from `/api/comms/media/:id` or bare filename. */
export function extractCommsMediaFilenameFromUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  const raw = String(fileUrl).trim();
  if (!raw) return null;
  const marker = "/api/comms/media/";
  const idx = raw.indexOf(marker);
  const segment = idx >= 0 ? raw.slice(idx + marker.length) : raw;
  const withoutQuery = segment.split("?")[0] || segment;
  try {
    const decoded = decodeURIComponent(withoutQuery);
    const base = path.basename(decoded);
    return base || null;
  } catch {
    const base = path.basename(withoutQuery);
    return base || null;
  }
}

/** Best-effort unlink for comms/Pshare uploads (ignores missing files). */
export function unlinkCommsMediaFile(
  fileUrl?: string | null,
  uploadDir = resolveCommsUploadDir(),
): void {
  const safeName = extractCommsMediaFilenameFromUrl(fileUrl);
  if (!safeName) return;
  const filePath = path.join(uploadDir, safeName);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e: any) {
    console.warn("[Comms] unlink media (non-fatal):", e?.message || e);
  }
}

export function unlinkCommsMediaUrls(
  urls: Array<string | null | undefined>,
  uploadDir = resolveCommsUploadDir(),
): void {
  for (const url of urls) unlinkCommsMediaFile(url, uploadDir);
}
