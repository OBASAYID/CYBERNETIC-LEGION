import type { ChatOutboundPayload } from "../contexts/PresenceContext";

export const GROUP_CONVERSATION_PREFIX = "group_";

export function isGroupConversationId(conversationId: string): boolean {
  return conversationId.startsWith(GROUP_CONVERSATION_PREFIX);
}

/** Socket.io `send-message` body — direct or group thread. */
export function buildPresenceSendMessagePayload(
  conversationId: string,
  payload: ChatOutboundPayload,
): Record<string, unknown> {
  const ts = payload.timestamp || new Date().toISOString();
  const base = {
    message: payload.message,
    messageType: payload.messageType || "text",
    fileUrl: payload.fileUrl,
    fileName: payload.fileName,
    fileMimeType: payload.fileMimeType,
    fileSizeBytes: payload.fileSizeBytes,
    voiceDurationSeconds: payload.voiceDurationSeconds,
    latitude: payload.latitude,
    longitude: payload.longitude,
    timestamp: ts,
  };
  if (isGroupConversationId(conversationId)) {
    return { ...base, groupId: conversationId };
  }
  return { ...base, targetUserId: conversationId };
}

export function buildTypingPayload(conversationId: string): {
  conversationId: string;
  targetUserId?: string;
  groupId?: string;
} {
  if (isGroupConversationId(conversationId)) {
    return { conversationId, groupId: conversationId };
  }
  return { conversationId, targetUserId: conversationId };
}
