import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { sharedMedia } from "../../shared/models/comms.js";
import { inferCommsMediaCategory } from "../../shared/comms/media-formats.js";
import { eq } from "drizzle-orm";

export type RegisterSharedMediaInput = {
  uploadedBy: string;
  uploaderName?: string | null;
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  callSessionId?: string | null;
  sharedWith?: string[];
};

export async function registerSharedMedia(input: RegisterSharedMediaInput) {
  const mediaId = uuid();
  const mediaType = inferCommsMediaCategory(input.fileName, input.mimeType || undefined);
  const [row] = await db
    .insert(sharedMedia)
    .values({
      mediaId,
      uploadedBy: input.uploadedBy,
      uploaderName: input.uploaderName || null,
      filename: input.fileName,
      mediaType,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize ?? null,
      mimeType: input.mimeType || null,
      callSessionId: input.callSessionId || null,
      sharedWith: input.sharedWith || [],
      annotations: [],
    })
    .returning();

  return {
    mediaId: row.mediaId,
    mediaType: row.mediaType,
    id: row.id,
  };
}

export async function appendSharedMediaAnnotation(
  mediaId: string,
  annotation: {
    userId: string;
    userName?: string | null;
    type: string;
    data?: unknown;
  },
) {
  const [media] = await db.select().from(sharedMedia).where(eq(sharedMedia.mediaId, mediaId)).limit(1);
  if (!media) return null;

  const existing = Array.isArray(media.annotations) ? (media.annotations as unknown[]) : [];
  const entry = {
    userId: annotation.userId,
    userName: annotation.userName || null,
    type: annotation.type,
    data: annotation.data ?? null,
    timestamp: new Date().toISOString(),
  };
  const updated = [...existing, entry];

  await db.update(sharedMedia).set({ annotations: updated }).where(eq(sharedMedia.mediaId, mediaId));
  return entry;
}
