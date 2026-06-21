import { systemFetch } from "@shared/cyrus-api-client";
import {
  COMMS_DEFAULT_CHUNK_BYTES,
  COMMS_DEFAULT_MAX_UPLOAD_BYTES,
  COMMS_DIRECT_UPLOAD_MAX_BYTES,
} from "@shared/comms/media-formats";

export type CommsUploadCapabilities = {
  maxUploadBytes: number;
  chunkSizeBytes: number;
  directUploadMaxBytes: number;
  supportsChunkedUpload: boolean;
};

let cached: CommsUploadCapabilities | null = null;
let inflight: Promise<CommsUploadCapabilities> | null = null;

const FALLBACK: CommsUploadCapabilities = {
  maxUploadBytes: COMMS_DEFAULT_MAX_UPLOAD_BYTES,
  chunkSizeBytes: COMMS_DEFAULT_CHUNK_BYTES,
  directUploadMaxBytes: COMMS_DIRECT_UPLOAD_MAX_BYTES,
  supportsChunkedUpload: true,
};

export function getCachedCommsUploadCapabilities(): CommsUploadCapabilities {
  return cached || FALLBACK;
}

export async function loadCommsUploadCapabilities(force = false): Promise<CommsUploadCapabilities> {
  if (cached && !force) return cached;
  if (inflight && !force) return inflight;

  inflight = (async () => {
    try {
      const res = await systemFetch("/api/comms/upload/capabilities");
      if (!res.ok) return FALLBACK;
      const data = (await res.json()) as Partial<CommsUploadCapabilities>;
      cached = {
        maxUploadBytes:
          typeof data.maxUploadBytes === "number" && data.maxUploadBytes > 0
            ? data.maxUploadBytes
            : FALLBACK.maxUploadBytes,
        chunkSizeBytes:
          typeof data.chunkSizeBytes === "number" && data.chunkSizeBytes > 0
            ? data.chunkSizeBytes
            : FALLBACK.chunkSizeBytes,
        directUploadMaxBytes:
          typeof data.directUploadMaxBytes === "number" && data.directUploadMaxBytes > 0
            ? data.directUploadMaxBytes
            : FALLBACK.directUploadMaxBytes,
        supportsChunkedUpload: data.supportsChunkedUpload !== false,
      };
      return cached;
    } catch {
      return FALLBACK;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
