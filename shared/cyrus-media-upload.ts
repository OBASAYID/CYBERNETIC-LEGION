/**
 * CYRUS document & media upload — shared accept lists and helpers for intelligence modules.
 */

import {
  buildCommsMediaFileAccept,
  formatCommsFileSize,
  getCommsMediaCategoryLabel,
  inferCommsMediaCategory,
  type CommsMediaCategory,
} from "./comms/media-formats.js";
import { parseMaxUploadFileBytes } from "./cyrus-document-limits.js";

/** Browser file-picker accept string — PDF, Office, HTML, images, audio, video, ebooks, archives, CAD. */
export const CYRUS_MEDIA_FILE_ACCEPT = buildCommsMediaFileAccept();

export const CYRUS_MEDIA_FORMAT_LABELS =
  "PDF · Word · Excel · PowerPoint · HTML · Markdown · Text · Images · Audio · Video · E-books · Archives · 3D/CAD";

export function cyrusMaxUploadLabel(): string {
  return formatCommsFileSize(parseMaxUploadFileBytes());
}

export function inferCyrusMediaCategory(fileName: string, mimeType?: string): CommsMediaCategory {
  return inferCommsMediaCategory(fileName, mimeType);
}

export function cyrusMediaCategoryLabel(fileName: string, mimeType?: string): string {
  return getCommsMediaCategoryLabel(inferCommsMediaCategory(fileName, mimeType));
}
