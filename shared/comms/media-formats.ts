/** Comms media format registry — chat, in-call, and heavy file sharing. */

export type CommsMediaCategory =
  | "image"
  | "video"
  | "audio"
  | "audiobook"
  | "ebook"
  | "document"
  | "html"
  | "archive"
  | "cad3d"
  | "other";

export const COMMS_MEDIA_EXTENSIONS: Record<CommsMediaCategory, readonly string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "tif", "tiff"],
  video: ["mp4", "webm", "mov", "mkv", "m4v", "avi", "wmv", "mpeg", "mpg", "3gp"],
  audio: ["mp3", "wav", "ogg", "flac", "aac", "m4a", "opus", "wma"],
  audiobook: ["m4b", "aa", "aax"],
  ebook: ["epub", "mobi", "azw", "azw3", "fb2", "pdf"],
  document: [
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "odt",
    "ods",
    "odp",
    "rtf",
    "txt",
    "csv",
    "md",
    "json",
    "xml",
  ],
  html: ["html", "htm", "xhtml"],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2"],
  cad3d: [
    "stl",
    "obj",
    "step",
    "stp",
    "iges",
    "igs",
    "glb",
    "gltf",
    "ply",
    "3mf",
    "fbx",
    "dae",
    "x_t",
    "x_b",
    "sldprt",
    "sldasm",
    "slddrw",
    "jt",
    "amf",
    "off",
    "wrl",
    "vrml",
  ],
  other: [],
};

export const COMMS_MEDIA_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  m4v: "video/mp4",
  m4a: "audio/mp4",
  m4b: "audio/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  wmv: "video/x-msvideo",
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
  azw: "application/vnd.amazon.ebook",
  azw3: "application/vnd.amazon.ebook",
  fb2: "application/x-fictionbook+xml",
  html: "text/html",
  htm: "text/html",
  aa: "audio/audible",
  aax: "audio/audible",
  opus: "audio/opus",
  flac: "audio/flac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  "7z": "application/x-7z-compressed",
  rar: "application/vnd.rar",
  gz: "application/gzip",
  bz2: "application/x-bzip2",
};

export const COMMS_DEFAULT_CHUNK_BYTES = 16 * 1024 * 1024;
export const COMMS_DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
/** Upper bound when CYRUS_COMMS_MAX_UPLOAD_BYTES is unset on the server (4 GiB). */
export const COMMS_HARD_MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;
export const COMMS_DIRECT_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

export function getCommsFileExtension(fileName?: string | null): string {
  if (!fileName) return "";
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return (parts.pop() || "").toLowerCase();
}

export function inferCommsMediaCategory(
  fileName?: string | null,
  mimeType?: string | null,
): CommsMediaCategory {
  const ext = getCommsFileExtension(fileName);
  const mt = (mimeType || "").toLowerCase();

  for (const [cat, exts] of Object.entries(COMMS_MEDIA_EXTENSIONS) as [CommsMediaCategory, readonly string[]][]) {
    if (ext && exts.includes(ext)) return cat;
  }

  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  if (mt.startsWith("audio/")) return mt.includes("audible") ? "audiobook" : "audio";
  if (mt.includes("epub") || mt.includes("mobipocket") || mt.includes("ebook")) return "ebook";
  if (mt.includes("html")) return "html";
  if (mt.startsWith("model/") || mt.includes("step") || mt.includes("gltf")) return "cad3d";
  if (mt.includes("pdf") || mt.includes("word") || mt.includes("excel") || mt.includes("powerpoint")) {
    return "document";
  }
  if (mt.includes("zip") || mt.includes("rar") || mt.includes("7z") || mt.includes("gzip")) return "archive";
  return "other";
}

export function guessCommsMediaMime(fileName?: string | null, mimeType?: string | null): string {
  if (mimeType && mimeType.trim()) return mimeType.trim();
  const ext = getCommsFileExtension(fileName);
  return COMMS_MEDIA_MIME[ext] || "application/octet-stream";
}

export function isStreamableCommsMedia(fileName?: string | null, mimeType?: string | null): boolean {
  const cat = inferCommsMediaCategory(fileName, mimeType);
  return cat === "image" || cat === "video" || cat === "audio" || cat === "audiobook";
}

export function formatCommsFileSize(bytes?: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Browser file-picker accept string */
export function buildCommsMediaFileAccept(): string {
  const exts = Object.values(COMMS_MEDIA_EXTENSIONS)
    .flat()
    .map((e) => `.${e}`);
  return [
    "image/*",
    "video/*",
    "audio/*",
    "application/pdf",
    "application/epub+zip",
    "application/zip",
    "application/x-7z-compressed",
    "application/vnd.rar",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/html",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/xml",
    exts.join(","),
  ].join(",");
}

export function getCommsMediaCategoryLabel(category: CommsMediaCategory): string {
  const labels: Record<CommsMediaCategory, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
    audiobook: "Audiobook",
    ebook: "E-book",
    document: "Document",
    html: "HTML",
    archive: "Archive",
    cad3d: "3D model",
    other: "File",
  };
  return labels[category];
}
