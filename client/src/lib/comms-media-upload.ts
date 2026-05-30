import {
  buildCommsMediaFileAccept,
  formatCommsFileSize,
  getCommsMediaCategoryLabel,
  inferCommsMediaCategory,
  isStreamableCommsMedia,
} from "@shared/comms/media-formats";
import {
  isCommsCad3dFile,
  guessCommsCadMime,
} from "./comms-cad-formats";
import {
  uploadCommsFileSmart,
  type CommsUploadProgress,
} from "./comms-chunk-upload";

/** Shared accept string for chat + in-call media pickers */
export const COMMS_MEDIA_FILE_ACCEPT = buildCommsMediaFileAccept();

export type { CommsUploadProgress };

export function isRichCommsMediaMime(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");
}

export type CommsUploadedMedia = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type CommsMediaMessagePayload = {
  message: string;
  messageType: "media" | "file" | "cad-3d";
  fileUrl: string;
  fileName: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
};

export type CommsMediaUploadOptions = {
  userId: string;
  fileName?: string;
  onProgress?: (progress: CommsUploadProgress) => void;
};

export function validateCommsMediaFile(file: File | Blob, fileName?: string): string | null {
  const name = fileName || (file instanceof File ? file.name : "");
  if (file.size <= 0) return "File is empty";
  const maxLabel = formatCommsFileSize(2 * 1024 * 1024 * 1024);
  if (file.size > 2 * 1024 * 1024 * 1024) {
    return `File exceeds maximum size (${maxLabel})`;
  }
  if (!name.trim()) return null;
  return null;
}

export async function uploadCommsMediaFile(
  file: File | Blob,
  options: CommsMediaUploadOptions,
): Promise<CommsUploadedMedia | null> {
  const name = options.fileName || (file instanceof File ? file.name : `upload_${Date.now()}`);
  const validationError = validateCommsMediaFile(file, name);
  if (validationError) {
    console.error("[comms] media validation:", validationError);
    return null;
  }

  try {
    const uploaded = await uploadCommsFileSmart(file, {
      userId: options.userId,
      fileName: name,
      onProgress: options.onProgress,
    });
    return {
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName || name,
      mimeType:
        uploaded.mimeType ||
        (file instanceof File ? file.type : "") ||
        guessCommsCadMime(uploaded.fileName || name) ||
        "",
      fileSize: uploaded.fileSize || file.size,
    };
  } catch (err) {
    console.error("[comms] media upload failed:", err);
    return null;
  }
}

export function buildCommsMediaMessagePayload(
  file: File | Blob,
  caption: string,
  uploaded: CommsUploadedMedia,
): CommsMediaMessagePayload {
  const mime = uploaded.mimeType || guessCommsCadMime(uploaded.fileName) || "";
  const category = inferCommsMediaCategory(uploaded.fileName, mime);
  const sizeLabel = formatCommsFileSize(uploaded.fileSize || file.size);

  if (isCommsCad3dFile(uploaded.fileName, mime)) {
    return {
      message: caption.trim() || `🧊 ${uploaded.fileName}${sizeLabel ? ` · ${sizeLabel}` : ""}`,
      messageType: "cad-3d",
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName,
      fileMimeType: mime || undefined,
      fileSizeBytes: uploaded.fileSize || file.size,
    };
  }

  const isRichMedia = isStreamableCommsMedia(uploaded.fileName, mime) || isRichCommsMediaMime(mime);
  const label = getCommsMediaCategoryLabel(category);

  return {
    message:
      caption.trim() ||
      (isRichMedia
        ? " "
        : `📎 ${label}: ${uploaded.fileName}${sizeLabel ? ` · ${sizeLabel}` : ""}`),
    messageType: isRichMedia ? "media" : "file",
    fileUrl: uploaded.fileUrl,
    fileName: uploaded.fileName,
    fileMimeType: mime || undefined,
    fileSizeBytes: uploaded.fileSize || file.size,
  };
}

export async function uploadAndBuildCommsMediaPayload(
  file: File | Blob,
  caption: string,
  userId: string,
  fileName?: string,
  onProgress?: (progress: CommsUploadProgress) => void,
): Promise<CommsMediaMessagePayload | null> {
  const uploaded = await uploadCommsMediaFile(file, { userId, fileName, onProgress });
  if (!uploaded) return null;
  return buildCommsMediaMessagePayload(file, caption, uploaded);
}
