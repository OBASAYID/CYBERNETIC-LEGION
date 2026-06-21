/**
 * Unified comms delivery — resilient persistence + offline store-and-forward.
 */

import { eq } from "drizzle-orm";
import { dbInsertMessage, dbDeleteMessage } from "./db-service.js";
import { directMessages } from "../../shared/models/comms.js";
import { unlinkCommsMediaFile } from "./upload-paths.js";

type MessageType =
  | "text"
  | "emoji"
  | "media"
  | "file"
  | "cad-3d"
  | "voice-note"
  | "location"
  | "system";

export type PersistedMessagePayload = {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  messageType: MessageType;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  sharedMediaId?: string;
  voiceDurationSeconds?: number;
  latitude?: number;
  longitude?: number;
  replyToId?: string;
  groupId?: string;
  targetUserId?: string;
};

type PendingEnvelope = PersistedMessagePayload & { queuedAt: number };

const pendingByRecipient = new Map<string, PendingEnvelope[]>();
const MAX_PENDING_PER_USER = 500;

function normalizeTextBody(
  messageType: MessageType,
  message: string,
  data: {
    latitude?: number;
    longitude?: number;
    voiceDurationSeconds?: number;
  },
): string {
  if (messageType === "location" && data.latitude != null && data.longitude != null) {
    return JSON.stringify({
      lat: data.latitude,
      lng: data.longitude,
      c: (message || "").trim(),
    });
  }
  if (messageType === "voice-note") {
    return JSON.stringify({
      d: data.voiceDurationSeconds ?? 0,
      c: (message || "").trim(),
    });
  }
  return (message || "").trim();
}

export async function persistChatMessage(input: {
  senderId: string;
  senderName: string;
  data: {
    targetUserId?: string;
    groupId?: string;
    message: string;
    messageType: MessageType;
    timestamp: string;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSizeBytes?: number;
    sharedMediaId?: string;
    voiceDurationSeconds?: number;
    latitude?: number;
    longitude?: number;
    replyToId?: string;
  };
}): Promise<PersistedMessagePayload> {
  const { senderId, senderName, data } = input;
  const messageType = data.messageType || "text";
  let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const textBody = normalizeTextBody(messageType, data.message, data);

  const values: typeof directMessages.$inferInsert = {
    senderId,
    recipientId: data.targetUserId || "",
    groupId: data.groupId || null,
    content: textBody,
    messageType,
    fileUrl: data.fileUrl || null,
    fileName: data.fileName || null,
    fileMimeType: data.fileMimeType || null,
    fileSizeBytes: data.fileSizeBytes ?? null,
    replyToId: data.replyToId || null,
  };

  const result = await dbInsertMessage(values);
  if (result.success && result.data?.id) messageId = result.data.id;

  return {
    id: messageId,
    senderId,
    senderName,
    message: data.message,
    messageType,
    timestamp: data.timestamp,
    fileUrl: data.fileUrl,
    fileName: data.fileName,
    fileMimeType: data.fileMimeType,
    fileSizeBytes: data.fileSizeBytes,
    sharedMediaId: data.sharedMediaId,
    voiceDurationSeconds: data.voiceDurationSeconds,
    latitude: data.latitude,
    longitude: data.longitude,
    replyToId: data.replyToId,
    groupId: data.groupId,
    targetUserId: data.targetUserId,
  };
}

export async function deleteChatMessage(input: {
  messageId: string;
  actorId: string;
}): Promise<
  | { ok: true; message: PersistedMessagePayload & { recipientId?: string; groupId?: string | null } }
  | { ok: false; error: string; status: number }
> {
  const { messageId, actorId } = input;
  const { db } = await import("../db.js");
  const [row] = await db
    .select()
    .from(directMessages)
    .where(eq(directMessages.id, messageId))
    .limit(1);
  if (!row) {
    return { ok: false, error: "Message not found", status: 404 };
  }
  if (row.senderId !== actorId) {
    return { ok: false, error: "Only the sender can delete this message", status: 403 };
  }
  const deleted = await dbDeleteMessage(messageId);
  if (!deleted.success) {
    return { ok: false, error: deleted.error || "Delete failed", status: 500 };
  }
  unlinkCommsMediaFile(row.fileUrl);
  return {
    ok: true,
    message: {
      id: row.id,
      senderId: row.senderId,
      senderName: row.senderId,
      message: row.content,
      messageType: (row.messageType || "text") as MessageType,
      timestamp: row.createdAt?.toISOString() || new Date().toISOString(),
      fileUrl: row.fileUrl || undefined,
      fileName: row.fileName || undefined,
      fileMimeType: row.fileMimeType || undefined,
      fileSizeBytes: row.fileSizeBytes ?? undefined,
      recipientId: row.recipientId,
      groupId: row.groupId ?? undefined,
      targetUserId: row.recipientId,
    },
  };
}

export function queueForOfflineRecipient(recipientId: string, payload: PersistedMessagePayload): void {
  const list = pendingByRecipient.get(recipientId) || [];
  list.push({ ...payload, queuedAt: Date.now() });
  while (list.length > MAX_PENDING_PER_USER) list.shift();
  pendingByRecipient.set(recipientId, list);
}

export function flushPendingForUser(
  recipientId: string,
  emit: (payload: PersistedMessagePayload) => void,
): number {
  const pending = pendingByRecipient.get(recipientId) || [];
  pendingByRecipient.delete(recipientId);
  for (const msg of pending) emit(msg);
  return pending.length;
}

export function getDeliveryHubStats() {
  let pending = 0;
  for (const list of pendingByRecipient.values()) pending += list.length;
  return { pendingMessages: pending, recipientsWithPending: pendingByRecipient.size };
}
