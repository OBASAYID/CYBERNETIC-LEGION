import { systemFetch } from "@shared/cyrus-api-client";
import {
  COMMS_DIRECT_UPLOAD_MAX_BYTES,
} from "@shared/comms/media-formats";
import {
  isPsharePhotoUpload,
  PSHARE_PHOTO_DIRECT_UPLOAD_MAX_BYTES,
} from "@shared/comms/pshare-engine";
import { getCommsDeviceId } from "./comms-device-id";
import { loadCommsUploadCapabilities } from "./comms-upload-capabilities";

export type CommsUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
  phase: "init" | "uploading" | "completing" | "done";
};

export type ChunkedUploadResult = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

const CHUNK_UPLOAD_RETRIES = 6;
const COMPLETE_UPLOAD_TIMEOUT_MS = 60 * 60 * 1000;

function commsUploadHeaders(userId: string, priority?: "photo" | "normal"): HeadersInit {
  const headers: Record<string, string> = {
    "X-Device-Id": getCommsDeviceId(),
    "X-User-Id": userId,
  };
  if (priority === "photo") headers["X-Cyrus-Upload-Priority"] = "photo";
  return headers;
}

function uploadConcurrency(totalBytes: number): number {
  if (totalBytes >= 1024 * 1024 * 1024) return 2;
  if (totalBytes >= 512 * 1024 * 1024) return 3;
  return 4;
}

async function commsUploadFetch(
  path: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  if (!timeoutMs) return systemFetch(path, init);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await systemFetch(path, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function uploadChunksParallel(
  file: File | Blob,
  init: { uploadId: string; chunkSize: number; totalChunks: number },
  total: number,
  userId: string,
  priority: "photo" | "normal",
  onProgress?: (p: CommsUploadProgress) => void,
): Promise<void> {
  let nextIndex = 0;
  let bytesLoaded = 0;
  const workers = uploadConcurrency(total);

  const worker = async () => {
    while (nextIndex < init.totalChunks) {
      const i = nextIndex++;
      const start = i * init.chunkSize;
      const end = Math.min(start + init.chunkSize, total);
      const slice = file.slice(start, end);
      await uploadChunkWithRetry(init.uploadId, i, slice, userId, priority);
      bytesLoaded += end - start;
      onProgress?.({
        loaded: bytesLoaded,
        total,
        percent: Math.min(99, Math.round((bytesLoaded / total) * 100)),
        phase: "uploading",
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(workers, init.totalChunks) }, () => worker()));
}

async function uploadChunkWithRetry(
  uploadId: string,
  chunkIndex: number,
  blob: Blob,
  userId: string,
  priority?: "photo" | "normal",
  retries = CHUNK_UPLOAD_RETRIES,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const form = new FormData();
      form.append("uploadId", uploadId);
      form.append("chunkIndex", String(chunkIndex));
      form.append("chunk", blob, `chunk-${chunkIndex}`);
      const res = await commsUploadFetch("/api/comms/upload/chunk", {
        method: "POST",
        body: form,
        headers: commsUploadHeaders(userId, priority),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Chunk ${chunkIndex} failed`);
      }
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function uploadCommsFileChunked(
  file: File | Blob,
  options: {
    userId: string;
    fileName?: string;
    mimeType?: string;
    chunkSize?: number;
    priority?: "photo" | "normal";
    onProgress?: (p: CommsUploadProgress) => void;
  },
): Promise<ChunkedUploadResult> {
  const caps = await loadCommsUploadCapabilities();
  const name = options.fileName || (file instanceof File ? file.name : `upload_${Date.now()}`);
  const mime =
    options.mimeType ||
    (file instanceof File ? file.type : "") ||
    "application/octet-stream";
  const priority =
    options.priority ?? (isPsharePhotoUpload(name, mime) ? "photo" : "normal");
  const total = file.size;

  if (total > caps.maxUploadBytes) {
    throw new Error(`File exceeds server limit (${caps.maxUploadBytes} bytes)`);
  }

  options.onProgress?.({ loaded: 0, total, percent: 0, phase: "init" });

  const initRes = await commsUploadFetch("/api/comms/upload/init", {
    method: "POST",
    headers: { ...commsUploadHeaders(options.userId, priority), "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: name, fileSize: total, mimeType: mime, priority }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Upload init failed");
  }
  const init = (await initRes.json()) as {
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
    mimeType?: string;
  };

  await uploadChunksParallel(file, init, total, options.userId, priority, options.onProgress);

  options.onProgress?.({ loaded: total, total, percent: 100, phase: "completing" });

  const completeRes = await commsUploadFetch(
    "/api/comms/upload/complete",
    {
      method: "POST",
      headers: { ...commsUploadHeaders(options.userId, priority), "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: init.uploadId }),
    },
    COMPLETE_UPLOAD_TIMEOUT_MS,
  );
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Upload complete failed");
  }
  const done = (await completeRes.json()) as ChunkedUploadResult;
  options.onProgress?.({ loaded: total, total, percent: 100, phase: "done" });
  return {
    fileUrl: done.fileUrl,
    fileName: done.fileName || name,
    mimeType: done.mimeType || init.mimeType || mime,
    fileSize: done.fileSize || total,
  };
}

export function shouldUseChunkedCommsUpload(
  fileSize: number,
  priority: "photo" | "normal" = "normal",
  directMaxBytes = COMMS_DIRECT_UPLOAD_MAX_BYTES,
): boolean {
  const directMax =
    priority === "photo" ? PSHARE_PHOTO_DIRECT_UPLOAD_MAX_BYTES : directMaxBytes;
  return fileSize > directMax;
}

async function uploadCommsFileDirect(
  file: File | Blob,
  options: {
    userId: string;
    fileName: string;
    mimeType: string;
    priority?: "photo" | "normal";
    onProgress?: (p: CommsUploadProgress) => void;
  },
): Promise<ChunkedUploadResult> {
  options.onProgress?.({ loaded: 0, total: file.size, percent: 0, phase: "uploading" });

  const form = new FormData();
  form.append("file", file, options.fileName);
  const res = await commsUploadFetch("/api/comms/upload", {
    method: "POST",
    body: form,
    headers: commsUploadHeaders(options.userId, options.priority),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Upload failed");
  }
  const data = (await res.json()) as {
    fileUrl: string;
    fileName: string;
    mimeType?: string;
    fileSize?: number;
  };
  options.onProgress?.({ loaded: file.size, total: file.size, percent: 100, phase: "done" });
  return {
    fileUrl: data.fileUrl,
    fileName: data.fileName || options.fileName,
    mimeType: data.mimeType || options.mimeType,
    fileSize: data.fileSize || file.size,
  };
}

export async function uploadCommsFileSmart(
  file: File | Blob,
  options: {
    userId: string;
    fileName?: string;
    priority?: "photo" | "normal";
    onProgress?: (p: CommsUploadProgress) => void;
  },
): Promise<ChunkedUploadResult> {
  const caps = await loadCommsUploadCapabilities();
  const name = options.fileName || (file instanceof File ? file.name : `upload_${Date.now()}`);
  const mime = (file instanceof File ? file.type : "") || "application/octet-stream";
  const priority =
    options.priority ?? (isPsharePhotoUpload(name, mime) ? "photo" : "normal");

  if (file.size > caps.maxUploadBytes) {
    throw new Error(`File exceeds server limit (${caps.maxUploadBytes} bytes)`);
  }

  if (!shouldUseChunkedCommsUpload(file.size, priority, caps.directUploadMaxBytes)) {
    return uploadCommsFileDirect(file, {
      userId: options.userId,
      fileName: name,
      mimeType: mime,
      priority,
      onProgress: options.onProgress,
    });
  }

  return uploadCommsFileChunked(file, {
    ...options,
    fileName: name,
    mimeType: mime,
    priority,
    chunkSize: caps.chunkSizeBytes,
  });
}
