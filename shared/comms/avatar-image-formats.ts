/** Profile photo / avatar image formats — permissive for phone cameras & design tools. */

export const AVATAR_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "svgz",
  "ico",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
  "jfif",
  "pjpeg",
  "pjp",
  "apng",
] as const;

const EXT_SET = new Set<string>(AVATAR_IMAGE_EXTENSIONS);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  pjpeg: "image/jpeg",
  pjp: "image/jpeg",
  png: "image/png",
  apng: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  svgz: "image/svg+xml",
  ico: "image/x-icon",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
};

/** Browser file picker — accept all common image types + HEIC/AVIF from phones. */
export const COMMS_AVATAR_FILE_ACCEPT = [
  "image/*",
  ...AVATAR_IMAGE_EXTENSIONS.map((e) => `.${e}`),
].join(",");

export function getAvatarImageExtension(fileName?: string | null): string | null {
  if (!fileName) return null;
  const base = fileName.split(/[\\/]/).pop() || fileName;
  const parts = base.split(".");
  if (parts.length < 2) return null;
  const ext = (parts.pop() || "").toLowerCase();
  return EXT_SET.has(ext) ? ext : null;
}

export function guessAvatarImageMime(fileName?: string | null, mimeType?: string | null): string {
  const mt = (mimeType || "").trim().toLowerCase();
  if (mt.startsWith("image/")) return mt;
  const ext = getAvatarImageExtension(fileName);
  if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  return "image/jpeg";
}

export function isAllowedAvatarImage(fileName?: string | null, mimeType?: string | null): boolean {
  const mt = (mimeType || "").trim().toLowerCase();
  if (mt.startsWith("image/")) return true;
  if (getAvatarImageExtension(fileName)) return true;
  // Some mobile browsers send HEIC as application/octet-stream
  if (mt === "application/octet-stream" && getAvatarImageExtension(fileName)) return true;
  return false;
}

export function avatarImageExtensionForSave(fileName?: string | null, mimeType?: string | null): string {
  const fromName = getAvatarImageExtension(fileName);
  if (fromName) return `.${fromName}`;
  const mt = guessAvatarImageMime(fileName, mimeType);
  if (mt.includes("png")) return ".png";
  if (mt.includes("webp")) return ".webp";
  if (mt.includes("gif")) return ".gif";
  if (mt.includes("svg")) return ".svg";
  if (mt.includes("heic")) return ".heic";
  if (mt.includes("heif")) return ".heif";
  if (mt.includes("avif")) return ".avif";
  if (mt.includes("tiff")) return ".tiff";
  if (mt.includes("bmp")) return ".bmp";
  if (mt.includes("icon") || mt.includes("ico")) return ".ico";
  return ".jpg";
}

/** Ensure multipart uploads carry a usable image MIME (fixes empty type from iOS/desktop). */
export function normalizeAvatarUploadFile(file: File): File {
  if (isAllowedAvatarImage(file.name, file.type) && file.type.startsWith("image/")) {
    return file;
  }
  if (!isAllowedAvatarImage(file.name, file.type)) return file;
  const mime = guessAvatarImageMime(file.name, file.type);
  return new File([file], file.name, { type: mime, lastModified: file.lastModified });
}

export const AVATAR_SERVE_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".pjpeg": "image/jpeg",
  ".pjp": "image/jpeg",
  ".png": "image/png",
  ".apng": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".ico": "image/x-icon",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
};
