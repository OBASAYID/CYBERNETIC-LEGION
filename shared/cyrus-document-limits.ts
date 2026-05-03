/**
 * Central caps for long-document ingestion, analysis, and UI (aligned with server env).
 * Browser: env vars are usually unset — defaults apply. Node: reads `process.env`.
 */

export const CYRUS_MAX_ANALYSIS_CHUNKS_CAP = 65_536;

/** Default max chunks for ~2000+ page corpora (heuristic chunk pass); override with CYRUS_MAX_ANALYSIS_CHUNKS. */
export const CYRUS_DEFAULT_MAX_ANALYSIS_CHUNKS = 8192;

export function parseMaxAnalysisChunks(): number {
  const raw =
    typeof process !== "undefined" && process.env?.CYRUS_MAX_ANALYSIS_CHUNKS
      ? parseInt(String(process.env.CYRUS_MAX_ANALYSIS_CHUNKS), 10)
      : NaN;
  if (Number.isFinite(raw) && raw >= 1) return Math.min(CYRUS_MAX_ANALYSIS_CHUNKS_CAP, raw);
  return CYRUS_DEFAULT_MAX_ANALYSIS_CHUNKS;
}

/** Files larger than this use async full-analysis by default in document UIs (bytes). */
export const CYRUS_DEFAULT_LARGE_UPLOAD_BYTES = 512 * 1024 * 1024;

const LARGE_UPLOAD_ASYNC_MAX_BYTES = 4 * 1024 * 1024 * 1024;

export function parseLargeUploadThresholdBytes(): number {
  const raw =
    typeof process !== "undefined" && process.env?.CYRUS_LARGE_UPLOAD_ASYNC_BYTES
      ? parseInt(String(process.env.CYRUS_LARGE_UPLOAD_ASYNC_BYTES), 10)
      : NaN;
  if (Number.isFinite(raw) && raw >= 8 * 1024 * 1024) return Math.min(LARGE_UPLOAD_ASYNC_MAX_BYTES, raw);
  return CYRUS_DEFAULT_LARGE_UPLOAD_BYTES;
}

/** Multer / single-upload ceiling (default 1GB, configurable up to 6GB). */
export const CYRUS_DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

const UPLOAD_MAX_CAP_BYTES = 6 * 1024 * 1024 * 1024;

export function parseMaxUploadFileBytes(): number {
  const raw =
    typeof process !== "undefined" && process.env?.CYRUS_UPLOAD_MAX_FILE_BYTES
      ? parseInt(String(process.env.CYRUS_UPLOAD_MAX_FILE_BYTES), 10)
      : NaN;
  if (Number.isFinite(raw) && raw >= 10 * 1024 * 1024) return Math.min(UPLOAD_MAX_CAP_BYTES, raw);
  return CYRUS_DEFAULT_MAX_UPLOAD_BYTES;
}

/** Express JSON body size for docgen and large payloads (default 256mb). */
export function parseExpressJsonBodyLimit(): string {
  const s =
    typeof process !== "undefined" && process.env?.CYRUS_JSON_BODY_LIMIT
      ? String(process.env.CYRUS_JSON_BODY_LIMIT).trim()
      : "";
  if (/^\d+(mb|kb|gb)$/i.test(s)) return s.toLowerCase();
  return "256mb";
}

/** Hard cap for long-form generation (aligned with server `docgen`). */
export const CYRUS_DOCGEN_MAX_PAGES_CAP = 4000;

export function maxDocgenTargetPages(): number {
  const raw =
    typeof process !== "undefined" && process.env?.CYRUS_DOCGEN_MAX_PAGES
      ? parseInt(String(process.env.CYRUS_DOCGEN_MAX_PAGES), 10)
      : NaN;
  if (Number.isFinite(raw) && raw >= 1) return Math.min(CYRUS_DOCGEN_MAX_PAGES_CAP, Math.floor(raw));
  return 2000;
}
