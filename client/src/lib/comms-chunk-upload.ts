import { systemFetch } from "@shared/cyrus-api-client";
import {
  COMMS_DEFAULT_CHUNK_BYTES,
  COMMS_DIRECT_UPLOAD_MAX_BYTES,
} from "@shared/comms/media-formats";
import { getCommsDeviceId } from "./comms-device-id";

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

function commsUploadHeaders(userId: string): HeadersInit {
  return { "X-Device-Id": getCommsDeviceId(), "X-User-Id": userId };
}

async function uploadChunkWithRetry(
  uploadId: string,
  chunkIndex: number,
  blob: Blob,
  userId: string,
  retries = 3,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const form = new FormData();
      form.append("uploadId", uploadId);
      form.append("chunkIndex", String(chunkIndex));
      form.append("chunk", blob, `chunk-${chunkIndex}`);
      const res = await systemFetch("/api/comms/upload/chunk", {
        method: "POST",
        body: form,
        headers: commsUploadHeaders(userId),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Chunk ${chunkIndex} failed`);
      }
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
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
    onProgress?: (p: CommsUploadProgress) => void;
  },
): Promise<ChunkedUploadResult> {
  const name = options.fileName || (file instanceof File ? file.name : `upload_${Date.now()}`);
  const mime =
    options.mimeType ||
    (file instanceof File ? file.type : "") ||
    "application/octet-stream";
  const total = file.size;
  const chunkSize = options.chunkSize || COMMS_DEFAULT_CHUNK_BYTES;

  options.onProgress?.({ loaded: 0, total, percent: 0, phase: "init" });

  const initRes = await systemFetch("/api/comms/upload/init", {
    method: "POST",
    headers: { ...commsUploadHeaders(options.userId), "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: name, fileSize: total, mimeType: mime }),
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

  let loaded = 0;
  for (let i = 0; i < init.totalChunks; i++) {
    const start = i * init.chunkSize;
    const end = Math.min(start + init.chunkSize, total);
    const slice = file.slice(start, end);
    await uploadChunkWithRetry(init.uploadId, i, slice, options.userId);
    loaded = end;
    options.onProgress?.({
      loaded,
      total,
      percent: Math.min(100, Math.round((loaded / total) * 100)),
      phase: "uploading",
    });
  }

  options.onProgress?.({ loaded: total, total, percent: 100, phase: "completing" });

  const completeRes = await systemFetch("/api/comms/upload/complete", {
    method: "POST",
    headers: { ...commsUploadHeaders(options.userId), "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId: init.uploadId }),
  });
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

export function shouldUseChunkedCommsUpload(fileSize: number): boolean {
  return fileSize > COMMS_DIRECT_UPLOAD_MAX_BYTES;
}

export async function uploadCommsFileSmart(
  file: File | Blob,
  options: {
    userId: string;
    fileName?: string;
    onProgress?: (p: CommsUploadProgress) => void;
  },
): Promise<ChunkedUploadResult> {
  if (shouldUseChunkedCommsUpload(file.size)) {
    return uploadCommsFileChunked(file, options);
  }

  const name = options.fileName || (file instanceof File ? file.name : `upload_${Date.now()}`);
  options.onProgress?.({ loaded: 0, total: file.size, percent: 0, phase: "uploading" });

  const form = new FormData();
  form.append("file", file, name);
  const res = await systemFetch("/api/comms/upload", {
    method: "POST",
    body: form,
    headers: commsUploadHeaders(options.userId),
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
    fileName: data.fileName || name,
    mimeType: data.mimeType || (file instanceof File ? file.type : "") || "application/octet-stream",
    fileSize: data.fileSize || file.size,
  };
}
