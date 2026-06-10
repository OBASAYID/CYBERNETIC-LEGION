/**
 * Shared types for CYRUS communication system — strict typing for messages, calls, and presence.
 */

export type CallType = "voice" | "video" | "conference" | "screen_share";
export type CallStatus =
  | "initiating"
  | "ringing"
  | "connected"
  | "on_hold"
  | "ended"
  | "declined"
  | "missed"
  | "failed";
export type UserStatus = "online" | "away" | "do_not_disturb" | "offline" | "in_call";
export type MessageType = "text" | "image" | "video" | "file" | "voice_note" | "system" | "location";

export interface ActiveCall {
  callId: string;
  callType: CallType;
  initiatorId: string;
  initiatorName: string;
  participants: string[];
  status: CallStatus;
  startedAt: Date | null;
  callQuality: number;
  bandwidthKbps: number;
  isRecording: boolean;
}

export interface ActiveConference {
  conferenceId: string;
  title: string;
  hostId: string;
  hostName: string;
  participants: string[];
  maxParticipants: number;
  startedAt: Date | null;
  isRecording: boolean;
  screenSharingBy: string | null;
  roomCode: string;
  password: string | null;
  meetingLink: string;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  status: UserStatus;
  lastSeen: Date;
  currentCallId: string | null;
  currentConferenceId: string | null;
  networkLatencyMs: number;
  connectionQuality: number;
}

export interface MessagePayload {
  senderId: string;
  recipientId: string;
  content: string;
  messageType: MessageType;
  isEncrypted: boolean;
  encryptionLevel: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  replyToId?: string | null;
  groupId?: string | null;
}

export interface DbOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QueuedOperation {
  id: string;
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface HealthCheckStatus {
  isHealthy: boolean;
  circuitOpen: boolean;
  consecutiveFailures: number;
  lastError: string | null;
  lastCheckedAt: Date | null;
  errorCategory?: string;
}

export interface QueueMetrics {
  queueSize: number;
  oldestAgeMs: number;
  totalEnqueued: number;
  totalFlushed: number;
  totalDropped: number;
  successRate: number;
}

export interface CommsFallbackStatus {
  active: boolean;
  queueSize: number;
  queueOldestAgeMs: number;
  fallbackStoreSizes: {
    messages: number;
    calls: number;
    rooms: number;
    users: number;
    groups: number;
    limits: {
      messages: number;
      calls: number;
      rooms: number;
      users: number;
      groups: number;
    };
    estimatedMemoryMB: number;
  };
}

export interface CommsDbStatus extends HealthCheckStatus {
  fallbackMode: boolean;
  queue: QueueMetrics;
  fallbackStoreSizes: {
    messages: number;
    calls: number;
    rooms: number;
    users: number;
    groups: number;
    limits: {
      messages: number;
      calls: number;
      rooms: number;
      users: number;
      groups: number;
    };
    estimatedMemoryMB: number;
  };
}

/** Validation helpers */
export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = "ValidationError";
  }
}

export function validateUserId(userId: unknown): string {
  if (typeof userId !== "string" || !userId.trim()) {
    throw new ValidationError("userId", "must be a non-empty string");
  }
  return userId.trim();
}

export function validateMessageContent(content: unknown): string {
  if (typeof content !== "string" || !content.trim()) {
    throw new ValidationError("content", "must be a non-empty string");
  }
  if (content.length > 10000) {
    throw new ValidationError("content", "must be less than 10000 characters");
  }
  return content.trim();
}

export function validateCallType(callType: unknown): CallType {
  const validTypes: CallType[] = ["voice", "video", "conference", "screen_share"];
  if (typeof callType !== "string" || !validTypes.includes(callType as CallType)) {
    throw new ValidationError("callType", `must be one of: ${validTypes.join(", ")}`);
  }
  return callType as CallType;
}

export function validateUserStatus(status: unknown): UserStatus {
  const validStatuses: UserStatus[] = ["online", "away", "do_not_disturb", "offline", "in_call"];
  if (typeof status !== "string" || !validStatuses.includes(status as UserStatus)) {
    throw new ValidationError("status", `must be one of: ${validStatuses.join(", ")}`);
  }
  return status as UserStatus;
}

export function validateMessageType(messageType: unknown): MessageType {
  const validTypes: MessageType[] = ["text", "image", "video", "file", "voice_note", "system", "location"];
  if (typeof messageType !== "string" || !validTypes.includes(messageType as MessageType)) {
    throw new ValidationError("messageType", `must be one of: ${validTypes.join(", ")}`);
  }
  return messageType as MessageType;
}

export function validatePositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(field, "must be a positive integer");
  }
  return value;
}

export function validateQualityScore(value: unknown, field: string): number {
  if (typeof value !== "number" || value < 0 || value > 1) {
    throw new ValidationError(field, "must be a number between 0 and 1");
  }
  return value;
}
