import { systemFetch } from "@shared/cyrus-api-client";
import { getCommsDeviceId } from "./comms-device-id";
import {
  COMMS_CAD_FILE_ACCEPT,
  guessCommsCadMime,
  isCommsCad3dFile,
} from "./comms-cad-formats";

/** Shared accept string for chat + in-call media pickers */
export const COMMS_MEDIA_FILE_ACCEPT =
  "image/*,video/*,audio/*," +
  "application/pdf,application/zip," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "text/plain,text/html,text/csv,text/markdown,application/json,application/xml," +
  ".pdf,.html,.htm,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp," +
  ".txt,.csv,.md,.json,.xml,.zip," +
  ".mp3,.m4a,.wav,.ogg,.flac,.aac,.mp4,.webm,.mov,.mkv," +
  COMMS_CAD_FILE_ACCEPT;

export function isRichCommsMediaMime(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");
}

export type CommsUploadedMedia = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
};

export type CommsMediaMessagePayload = {
  message: string;
  messageType: "media" | "file" | "cad-3d";
  fileUrl: string;
  fileName: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
};

export async function uploadCommsMediaFile(
  file: File | Blob,
  options: { userId: string; fileName?: string },
): Promise<CommsUploadedMedia | null> {
  const formData = new FormData();
  const name = options.fileName || (file instanceof File ? file.name : `upload_${Date.now()}`);
  formData.append("file", file, name);
  try {
    const res = await systemFetch("/api/comms/upload", {
      method: "POST",
      body: formData,
      headers: { "X-Device-Id": getCommsDeviceId(), "X-User-Id": options.userId },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { fileUrl: string; fileName: string; mimeType?: string };
    return {
      fileUrl: data.fileUrl,
      fileName: data.fileName || name,
      mimeType:
        data.mimeType ||
        (file instanceof File ? file.type : "") ||
        guessCommsCadMime(data.fileName || name) ||
        "",
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
  if (isCommsCad3dFile(uploaded.fileName, mime)) {
    return {
      message: caption.trim() || `🧊 ${uploaded.fileName}`,
      messageType: "cad-3d",
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName,
      fileMimeType: mime || undefined,
      fileSizeBytes: file.size,
    };
  }
  const isRichMedia = isRichCommsMediaMime(mime);
  return {
    message: caption.trim() || (isRichMedia ? " " : `📎 ${uploaded.fileName}`),
    messageType: isRichMedia ? "media" : "file",
    fileUrl: uploaded.fileUrl,
    fileName: uploaded.fileName,
    fileMimeType: mime || undefined,
    fileSizeBytes: file.size,
  };
}

export async function uploadAndBuildCommsMediaPayload(
  file: File | Blob,
  caption: string,
  userId: string,
  fileName?: string,
): Promise<CommsMediaMessagePayload | null> {
  const uploaded = await uploadCommsMediaFile(file, { userId, fileName });
  if (!uploaded) return null;
  return buildCommsMediaMessagePayload(file, caption, uploaded);
}
