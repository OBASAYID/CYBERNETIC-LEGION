import { systemFetch } from "@shared/cyrus-api-client";
import { inferCommsMediaCategory } from "@shared/comms/media-formats";

/** Stable session key for DM / peer shared-media review threads. */
export function dmSharedMediaSessionId(userA: string, userB: string): string {
  return `dm:${[userA, userB].sort().join(":")}`;
}

export type SharedMediaRecord = {
  mediaId: string;
  mediaType: string;
  annotations?: unknown[];
};

export async function registerCommsSharedMedia(input: {
  userId: string;
  uploaderName?: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  callSessionId?: string;
  sharedWith?: string[];
}): Promise<SharedMediaRecord | null> {
  try {
    const res = await systemFetch("/api/comms/shared-media", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": input.userId,
      },
      body: JSON.stringify({
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        callSessionId: input.callSessionId,
        sharedWith: input.sharedWith,
        mediaType: inferCommsMediaCategory(input.fileName, input.mimeType),
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SharedMediaRecord;
  } catch {
    return null;
  }
}

export async function annotateCommsSharedMedia(
  mediaId: string,
  input: { annotationType: "comment" | "drawing" | "highlight"; annotationData: unknown; userName?: string },
): Promise<boolean> {
  try {
    const res = await systemFetch(`/api/comms/shared-media/${encodeURIComponent(mediaId)}/annotate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annotationType: input.annotationType,
        annotationData: input.annotationData,
        userName: input.userName,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
