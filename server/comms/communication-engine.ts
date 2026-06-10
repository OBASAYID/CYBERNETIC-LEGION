import { v4 as uuid } from "uuid";
import crypto from "crypto";
import {
  dbInsertMessage,
  dbGetConversation,
  dbMarkAsRead,
  dbAddReaction,
  dbGetGroupMessages,
  dbInsertGroupChat,
  dbGetGroupChats,
  dbInsertCall,
  dbUpdateCall,
  dbInsertMeetingRoom,
  dbUpdateMeetingRoom,
  dbUpsertOnlineUser,
  dbEvents,
  checkDbHealth,
  getDbHealthState,
  flushFallbackData,
  getFallbackStoreSizes,
} from "./db-service.js";
import { messageQueue } from "./message-queue.js";
import {
  type CallType,
  type CallStatus,
  type UserStatus,
  type MessageType,
  type ActiveCall,
  type ActiveConference,
  type UserPresence,
  type MessagePayload,
  type QueueMetrics,
  type CommsDbStatus,
  validateUserId,
  validateMessageContent,
  validateCallType,
  validateUserStatus,
  validateMessageType,
  validatePositiveInteger,
  ValidationError,
} from "./comms-types.js";
import { CommsError, CommsErrorCode, withCommsErrorHandling } from "./comms-errors.js";

/** Type re-exports from comms-types.ts */
export type {
  CallType,
  CallStatus,
  UserStatus,
  MessageType,
  ActiveCall,
  ActiveConference,
  UserPresence,
  MessagePayload,
};

class EncryptionEngine {
  private keys: Map<string, Buffer> = new Map();
  private readonly KEY_SIZE = 32; // 256 bits for AES-256
  private readonly IV_SIZE = 16; // 128 bits
  private readonly MAX_KEYS = 10000; // Prevent memory leaks

  generateKey(userId: string): string {
    try {
      validateUserId(userId);
      
      // Prevent memory leaks by limiting key storage
      if (this.keys.size >= this.MAX_KEYS && !this.keys.has(userId)) {
        console.warn(`[EncryptionEngine] Key cache full (${this.MAX_KEYS}), evicting oldest entry`);
        const firstKey = this.keys.keys().next().value;
        if (firstKey) this.keys.delete(firstKey);
      }

      const key = crypto.randomBytes(this.KEY_SIZE);
      this.keys.set(userId, key);
      console.log(`[EncryptionEngine] Generated encryption key for user: ${userId}`);
      return key.toString("hex");
    } catch (error) {
      console.error(`[EncryptionEngine] Key generation failed for ${userId}:`, error);
      throw CommsError.encryptionError("Failed to generate encryption key");
    }
  }

  encrypt(userId: string, message: string): string {
    const key = this.keys.get(userId);
    if (!key) {
      console.warn(`[EncryptionEngine] No encryption key for user ${userId}, storing plaintext`);
      return message;
    }
    
    try {
      const iv = crypto.randomBytes(this.IV_SIZE);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(message, "utf8", "hex");
      encrypted += cipher.final("hex");
      return `${iv.toString("hex")}:${encrypted}`;
    } catch (error) {
      console.error(`[EncryptionEngine] Encryption failed for user ${userId}:`, error);
      // Fallback to plaintext rather than failing
      return message;
    }
  }

  hasKey(userId: string): boolean {
    return this.keys.has(userId);
  }

  decrypt(userId: string, encrypted: string): string {
    const key = this.keys.get(userId);
    if (!key) {
      console.warn(`[EncryptionEngine] No decryption key for user ${userId}, returning as-is`);
      return encrypted;
    }
    
    try {
      const parts = encrypted.split(":");
      if (parts.length !== 2) {
        console.warn(`[EncryptionEngine] Invalid encrypted format for user ${userId}`);
        return encrypted;
      }
      
      const [ivHex, data] = parts;
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(data, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error(`[EncryptionEngine] Decryption failed for user ${userId}:`, error);
      // Return encrypted text rather than failing
      return encrypted;
    }
  }

  /** Remove encryption key for a user (e.g., on logout) */
  removeKey(userId: string): boolean {
    const existed = this.keys.has(userId);
    this.keys.delete(userId);
    if (existed) {
      console.log(`[EncryptionEngine] Removed encryption key for user: ${userId}`);
    }
    return existed;
  }

  /** Get current number of stored encryption keys */
  getKeyCount(): number {
    return this.keys.size;
  }
}

class CommunicationEngine {
  private activeCalls: Map<string, ActiveCall> = new Map();
  private activeConferences: Map<string, ActiveConference> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private encryption: EncryptionEngine = new EncryptionEngine();
  private messageCount: number = 0;
  private callHistoryCache: ActiveCall[] = [];

  /** True when the DB is unreachable and we are operating from in-memory fallback. */
  public isUsingFallback: boolean = false;

  /** Periodic health-check interval handle. */
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    console.log("[Communication Engine] Advanced Communication Engine v2.0 initialized");
    this._bindDbEvents();
    this._startHealthCheck();
  }

  // -------------------------------------------------------------------------
  // DB event wiring & health monitoring
  // -------------------------------------------------------------------------

  private _bindDbEvents(): void {
    dbEvents.on("db:down", (reason: string) => {
      if (!this.isUsingFallback) {
        this.isUsingFallback = true;
        console.warn(`[CommEngine] Fallback mode ACTIVATED — DB offline: ${reason}`);
      }
    });

    dbEvents.on("db:up", async () => {
      if (this.isUsingFallback) {
        console.log("[CommEngine] DB recovered — flushing queued operations…");
        await this._syncOfflineQueue();
        const flushed = await flushFallbackData();
        console.log("[CommEngine] Fallback flush complete:", flushed);
        this.isUsingFallback = false;
        console.log("[CommEngine] Fallback mode DEACTIVATED — operating normally.");
      }
    });
  }

  private _startHealthCheck(): void {
    // Probe every 30 s; if the circuit is open this is how we detect recovery.
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await checkDbHealth();
      if (healthy && this.isUsingFallback) {
        // db:up event will be emitted by checkDbHealth → recordSuccess
      }
    }, 30_000);
  }

  /** Flush the message queue by re-running each queued operation against the DB. */
  private async _syncOfflineQueue(): Promise<void> {
    const ops = messageQueue.drain();
    if (ops.length === 0) return;

    console.log(`[CommEngine] Syncing ${ops.length} queued operation(s)…`);
    let flushed = 0;

    for (const op of ops) {
      try {
        switch (op.type) {
          case "sendMessage":
            await dbInsertMessage(op.payload as any);
            break;
          case "markAsRead":
            await dbMarkAsRead(op.payload.messageId as string);
            break;
          case "addReaction":
            await dbAddReaction(
              op.payload.messageId as string,
              op.payload.userId as string,
              op.payload.reaction as string
            );
            break;
          case "initiateCall":
            await dbInsertCall(op.payload as any);
            break;
          case "updatePresence":
            await dbUpsertOnlineUser(op.payload as any);
            break;
          default:
            console.warn(`[CommEngine] Unknown queued op type: ${op.type}`);
        }
        flushed++;
      } catch (err) {
        console.error(`[CommEngine] Failed to sync queued op ${op.id} (${op.type}):`, err);
      }
    }

    messageQueue.recordFlush(flushed);
    console.log(`[CommEngine] Queue sync complete: ${flushed}/${ops.length} succeeded.`);
  }

  async sendMessage(
    senderId: string,
    recipientId: string | null,
    groupId: string | null,
    content: string,
    messageType: MessageType = "text",
    replyToId?: string,
    fileUrl?: string,
    fileName?: string,
    fileSizeBytes?: number,
  ): Promise<MessagePayload | null> {
    try {
      // Validate inputs
      validateUserId(senderId);
      if (recipientId) validateUserId(recipientId);
      if (groupId) validateUserId(groupId);
      validateMessageContent(content);
      validateMessageType(messageType);

      if (!recipientId && !groupId) {
        console.warn(`[CommEngine] sendMessage: Neither recipientId nor groupId provided, defaulting to broadcast`);
      }

      if (fileSizeBytes !== undefined && fileSizeBytes !== null) {
        validatePositiveInteger(fileSizeBytes, "fileSizeBytes");
      }

      const hasKey = this.encryption.hasKey(senderId);
      const isEncrypted = hasKey;
      const storedContent = hasKey ? this.encryption.encrypt(senderId, content) : content;

      const payload: MessagePayload = {
        senderId,
        recipientId: recipientId || "broadcast",
        content: storedContent,
        messageType,
        isEncrypted,
        encryptionLevel: isEncrypted ? "aes_256" : "none",
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSizeBytes: fileSizeBytes ?? null,
        replyToId: replyToId || null,
        groupId: groupId || null,
      };

      // Queue for offline sync if in fallback mode
      if (this.isUsingFallback) {
        messageQueue.enqueue("sendMessage", payload as unknown as Record<string, unknown>);
      }

      const result = await dbInsertMessage(payload);
      if (!result.success) {
        console.error(`[CommEngine] sendMessage DB error: ${result.error}`);
        throw CommsError.databaseError("insert message", new Error(result.error));
      }

      this.messageCount++;
      console.log(
        `[Comms] Message sent from ${senderId} to ${recipientId || groupId || "broadcast"} (${messageType}, encrypted=${isEncrypted})`,
      );
      
      // Return with proper typing
      return result.data ? {
        ...result.data,
        messageType: result.data.messageType as MessageType,
      } as MessagePayload : null;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof CommsError) {
        console.error(`[CommEngine] sendMessage validation error:`, error);
        throw error;
      }
      console.error(`[CommEngine] sendMessage unexpected error:`, error);
      throw CommsError.internalError("Failed to send message", error as Error);
    }
  }

  async getConversation(userId: string, otherUserId: string, limit: number = 50) {
    const result = await dbGetConversation(userId, otherUserId, limit);
    if (!result.success) {
      console.error(`[CommEngine] getConversation error: ${result.error}`);
      return [];
    }
    return result.data;
  }

  async markAsRead(messageId: string, readerId: string) {
    if (this.isUsingFallback) {
      messageQueue.enqueue("markAsRead", { messageId, readerId });
    }
    const result = await dbMarkAsRead(messageId);
    if (!result.success) {
      console.error(`[CommEngine] markAsRead error: ${result.error}`);
    }
    return { messageId, readerId, readAt: new Date().toISOString() };
  }

  async addReaction(messageId: string, userId: string, reaction: string) {
    if (this.isUsingFallback) {
      messageQueue.enqueue("addReaction", { messageId, userId, reaction });
    }
    const result = await dbAddReaction(messageId, userId, reaction);
    if (!result.success) {
      console.error(`[CommEngine] addReaction error: ${result.error}`);
      return null;
    }
    return result.data;
  }

  async getGroupMessages(groupId: string, limit: number = 50) {
    const result = await dbGetGroupMessages(groupId, limit);
    if (!result.success) {
      console.error(`[CommEngine] getGroupMessages error: ${result.error}`);
      return [];
    }
    return result.data;
  }

  async createGroupChat(name: string, createdBy: string, members: string[]) {
    const allMembers = [createdBy, ...members.filter(m => m !== createdBy)];
    const result = await dbInsertGroupChat({
      name,
      createdBy,
      members: allMembers,
      isEncrypted: true,
    });
    if (!result.success) {
      console.error(`[CommEngine] createGroupChat error: ${result.error}`);
      return null;
    }
    console.log(`[Comms] Group chat created: ${name} by ${createdBy} (${allMembers.length} members)`);
    return result.data;
  }

  async getGroupChats(userId: string) {
    const result = await dbGetGroupChats();
    if (!result.success) {
      console.error(`[CommEngine] getGroupChats error: ${result.error}`);
      return [];
    }
    return result.data.filter(g => {
      const members = (g.members as string[]) || [];
      return members.includes(userId);
    });
  }

  async initiateCall(
    initiatorId: string,
    initiatorName: string,
    recipientId: string,
    callType: CallType = "voice",
  ): Promise<ActiveCall> {
    try {
      // Validate inputs
      validateUserId(initiatorId);
      validateUserId(recipientId);
      validateCallType(callType);

      if (initiatorId === recipientId) {
        throw CommsError.invalidInput("recipientId", "cannot call yourself");
      }

      const callId = uuid();
      const roomId = `call_${callId.substring(0, 8)}`;

      const call: ActiveCall = {
        callId,
        callType,
        initiatorId,
        initiatorName: initiatorName || initiatorId,
        participants: [initiatorId, recipientId],
        status: "ringing",
        startedAt: null,
        callQuality: 1.0,
        bandwidthKbps: 0,
        isRecording: false,
      };

      this.activeCalls.set(callId, call);

      const callPayload = {
        callerId: initiatorId,
        recipientId,
        roomId,
        callType,
        status: "ringing" as const,
      };

      if (this.isUsingFallback) {
        messageQueue.enqueue("initiateCall", callPayload as unknown as Record<string, unknown>);
      }

      const result = await dbInsertCall(callPayload);
      if (!result.success) {
        console.error(`[CommEngine] initiateCall DB error: ${result.error}`);
        // Continue even if DB insert fails - call state is in memory
      }

      console.log(`[Comms] Call initiated: ${initiatorName} -> ${recipientId} (${callType}, callId=${callId})`);
      return call;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof CommsError) {
        throw error;
      }
      console.error(`[CommEngine] initiateCall unexpected error:`, error);
      throw CommsError.internalError("Failed to initiate call", error as Error);
    }
  }

  async acceptCall(callId: string, acceptorId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call) return false;

    call.status = "connected";
    call.startedAt = new Date();

    const roomId = `call_${callId.substring(0, 8)}`;
    const result = await dbUpdateCall(roomId, { status: "connected", startedAt: call.startedAt });
    if (!result.success) {
      console.error(`[CommEngine] acceptCall DB error: ${result.error}`);
    }

    console.log(`[Comms] Call ${callId} accepted by ${acceptorId}`);
    return true;
  }

  async declineCall(callId: string, declinerId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call) return false;

    call.status = "declined";
    this.activeCalls.delete(callId);
    this.callHistoryCache.push(call);

    const roomId = `call_${callId.substring(0, 8)}`;
    const result = await dbUpdateCall(roomId, { status: "declined", endedAt: new Date(), declinedBy: [declinerId] });
    if (!result.success) {
      console.error(`[CommEngine] declineCall DB error: ${result.error}`);
    }

    console.log(`[Comms] Call ${callId} declined by ${declinerId}`);
    return true;
  }

  async endCall(callId: string, endedBy: string): Promise<ActiveCall | null> {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    call.status = "ended";
    const duration = call.startedAt 
      ? Math.round((Date.now() - call.startedAt.getTime()) / 1000) 
      : 0;

    this.activeCalls.delete(callId);
    this.callHistoryCache.push(call);

    const roomId = `call_${callId.substring(0, 8)}`;
    const result = await dbUpdateCall(roomId, { status: "ended", endedAt: new Date(), duration: String(duration) });
    if (!result.success) {
      console.error(`[CommEngine] endCall DB error: ${result.error}`);
    }

    console.log(`[Comms] Call ${callId} ended by ${endedBy} (duration: ${duration}s)`);
    return { ...call, status: "ended" };
  }

  async createConference(
    hostId: string,
    hostName: string,
    title: string,
    description?: string,
    maxParticipants: number = 999,
    password?: string,
    participantIds: string[] = []
  ): Promise<ActiveConference> {
    const conferenceId = uuid();
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const meetingLink = `cyrus-meet-${roomCode}`;

    const conference: ActiveConference = {
      conferenceId,
      title,
      hostId,
      hostName,
      participants: [hostId, ...participantIds],
      maxParticipants,
      startedAt: new Date(),
      isRecording: false,
      screenSharingBy: null,
      roomCode,
      password: password || null,
      meetingLink,
    };

    this.activeConferences.set(conferenceId, conference);

    const result = await dbInsertMeetingRoom({
      name: title,
      hostId,
      roomCode,
      participants: conference.participants,
      maxParticipants: String(maxParticipants),
      description: description || null,
      password: password || null,
      meetingLink,
    });
    if (!result.success) {
      console.error(`[CommEngine] createConference DB error: ${result.error}`);
    }

    console.log(`[Comms] Conference created: "${title}" by ${hostName} (${conference.participants.length} participants)`);
    return conference;
  }

  async joinConference(conferenceId: string, userId: string, userName: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;
    if (conference.participants.length >= conference.maxParticipants) return false;

    if (!conference.participants.includes(userId)) {
      conference.participants.push(userId);
    }

    const result = await dbUpdateMeetingRoom(conference.roomCode, { participants: conference.participants });
    if (!result.success) {
      console.error(`[CommEngine] joinConference DB error: ${result.error}`);
    }

    console.log(`[Comms] ${userName} joined conference "${conference.title}" (${conference.participants.length} participants)`);
    return true;
  }

  async leaveConference(conferenceId: string, userId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;

    conference.participants = conference.participants.filter(p => p !== userId);

    if (conference.screenSharingBy === userId) {
      conference.screenSharingBy = null;
    }

    const result = await dbUpdateMeetingRoom(conference.roomCode, {
      participants: conference.participants,
      screenSharingBy: conference.screenSharingBy,
    });
    if (!result.success) {
      console.error(`[CommEngine] leaveConference DB error: ${result.error}`);
    }

    if (userId === conference.hostId || conference.participants.length === 0) {
      return this.endConference(conferenceId);
    }

    return true;
  }

  async endConference(conferenceId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;

    const duration = conference.startedAt 
      ? Math.round((Date.now() - conference.startedAt.getTime()) / 1000) 
      : 0;

    const result = await dbUpdateMeetingRoom(conference.roomCode, {
      isActive: false,
      endedAt: new Date(),
      isRecording: false,
      screenSharingBy: null,
    });
    if (!result.success) {
      console.error(`[CommEngine] endConference DB error: ${result.error}`);
    }

    this.activeConferences.delete(conferenceId);
    console.log(`[Comms] Conference "${conference.title}" ended (duration: ${duration}s)`);
    return true;
  }

  async startScreenShare(conferenceId: string, userId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;
    if (conference.screenSharingBy) return false;

    conference.screenSharingBy = userId;

    const result = await dbUpdateMeetingRoom(conference.roomCode, { screenSharingBy: userId });
    if (!result.success) {
      console.error(`[CommEngine] startScreenShare DB error: ${result.error}`);
    }

    console.log(`[Comms] Screen sharing started in "${conference.title}" by ${userId}`);
    return true;
  }

  async stopScreenShare(conferenceId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;

    conference.screenSharingBy = null;

    const result = await dbUpdateMeetingRoom(conference.roomCode, { screenSharingBy: null });
    if (!result.success) {
      console.error(`[CommEngine] stopScreenShare DB error: ${result.error}`);
    }

    console.log(`[Comms] Screen sharing stopped in "${conference.title}"`);
    return true;
  }

  async toggleRecording(conferenceId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;

    conference.isRecording = !conference.isRecording;

    const result = await dbUpdateMeetingRoom(conference.roomCode, { isRecording: conference.isRecording });
    if (!result.success) {
      console.error(`[CommEngine] toggleRecording DB error: ${result.error}`);
    }

    console.log(`[Comms] Recording ${conference.isRecording ? "started" : "stopped"} in "${conference.title}"`);
    return conference.isRecording;
  }

  async updatePresence(userId: string, displayName: string, status: UserStatus): Promise<UserPresence> {
    try {
      // Validate inputs
      validateUserId(userId);
      validateUserStatus(status);

      const presence: UserPresence = {
        userId,
        displayName: displayName || userId,
        status,
        lastSeen: new Date(),
        currentCallId: null,
        currentConferenceId: null,
        networkLatencyMs: 0,
        connectionQuality: 1.0,
      };

      const existing = this.userPresence.get(userId);
      if (existing) {
        presence.currentCallId = existing.currentCallId;
        presence.currentConferenceId = existing.currentConferenceId;
      }

      this.userPresence.set(userId, presence);

      const upsertPayload = {
        id: userId,
        displayName: displayName || userId,
        isOnline: status !== "offline",
        lastSeen: new Date(),
        status,
      };

      if (this.isUsingFallback) {
        messageQueue.enqueue("updatePresence", upsertPayload as unknown as Record<string, unknown>);
      }

      const result = await dbUpsertOnlineUser(upsertPayload);
      if (!result.success) {
        console.error(`[CommEngine] updatePresence DB error: ${result.error}`);
        // Continue even if DB update fails - presence is in memory
      }

      console.log(`[Comms] Presence updated: ${displayName} -> ${status}`);
      return presence;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof CommsError) {
        throw error;
      }
      console.error(`[CommEngine] updatePresence unexpected error:`, error);
      throw CommsError.internalError("Failed to update presence", error as Error);
    }
  }

  getPresence(userId: string): UserPresence | null {
    return this.userPresence.get(userId) || null;
  }

  getAllOnlinePresence(): UserPresence[] {
    return Array.from(this.userPresence.values()).filter(p => p.status !== "offline");
  }

  getStatistics() {
    const dbHealth = getDbHealthState();
    const queueMetrics = messageQueue.getMetrics();
    return {
      activeCalls: this.activeCalls.size,
      activeConferences: this.activeConferences.size,
      totalMessages: this.messageCount,
      onlineUsers: Array.from(this.userPresence.values()).filter(p => p.status !== "offline").length,
      totalCallHistory: this.callHistoryCache.length,
      averageCallDuration: this.callHistoryCache.length > 0
        ? Math.round(this.callHistoryCache.reduce((sum, c) => {
            if (c.startedAt) {
              return sum + Math.round((Date.now() - c.startedAt.getTime()) / 1000);
            }
            return sum;
          }, 0) / this.callHistoryCache.length)
        : 0,
      conferences: Array.from(this.activeConferences.values()).map(c => ({
        id: c.conferenceId,
        title: c.title,
        participants: c.participants.length,
        screenSharing: !!c.screenSharingBy,
        recording: c.isRecording,
      })),
      module: "Advanced Communication Engine v2.0",
      status: this.isUsingFallback ? "fallback" : "operational",
      fallback: {
        active: this.isUsingFallback,
        queueSize: queueMetrics.queueSize,
        queueOldestAgeMs: queueMetrics.oldestAgeMs,
        fallbackStoreSizes: getFallbackStoreSizes(),
      },
      db: {
        healthy: dbHealth.isHealthy,
        circuitOpen: dbHealth.circuitOpen,
        consecutiveFailures: dbHealth.consecutiveFailures,
        lastError: dbHealth.lastError,
        lastCheckedAt: dbHealth.lastCheckedAt?.toISOString() ?? null,
      },
    };
  }

  /** Returns the current DB + fallback status for the health endpoint. */
  getDbStatus(): CommsDbStatus {
    const dbHealth = getDbHealthState();
    const queueMetrics = messageQueue.getMetrics();
    return {
      isHealthy: dbHealth.isHealthy,
      circuitOpen: dbHealth.circuitOpen,
      consecutiveFailures: dbHealth.consecutiveFailures,
      lastError: dbHealth.lastError,
      errorCategory: dbHealth.errorCategory ?? undefined,
      lastCheckedAt: dbHealth.lastCheckedAt ?? null,
      fallbackMode: this.isUsingFallback,
      queue: {
        queueSize: queueMetrics.queueSize,
        oldestAgeMs: queueMetrics.oldestAgeMs,
        totalEnqueued: queueMetrics.totalEnqueued,
        totalFlushed: queueMetrics.totalFlushed,
        totalDropped: queueMetrics.totalDropped,
        successRate: queueMetrics.successRate,
      },
      fallbackStoreSizes: getFallbackStoreSizes(),
    };
  }

  getActiveCalls(): ActiveCall[] {
    return Array.from(this.activeCalls.values());
  }

  getActiveConferences(): ActiveConference[] {
    return Array.from(this.activeConferences.values());
  }

  getConference(conferenceId: string): ActiveConference | null {
    try {
      validateUserId(conferenceId);
      return this.activeConferences.get(conferenceId) || null;
    } catch (error) {
      console.error(`[CommEngine] getConference validation error:`, error);
      return null;
    }
  }

  getCall(callId: string): ActiveCall | null {
    try {
      validateUserId(callId);
      return this.activeCalls.get(callId) || null;
    } catch (error) {
      console.error(`[CommEngine] getCall validation error:`, error);
      return null;
    }
  }

  generateEncryptionKey(userId: string): string {
    try {
      validateUserId(userId);
      return this.encryption.generateKey(userId);
    } catch (error) {
      console.error(`[CommEngine] generateEncryptionKey error:`, error);
      throw error;
    }
  }

  /** Get encryption engine statistics for monitoring */
  getEncryptionStats(): { keyCount: number; maxKeys: number } {
    return {
      keyCount: this.encryption.getKeyCount(),
      maxKeys: 10000, // Match MAX_KEYS from EncryptionEngine
    };
  }
}

export const communicationEngine = new CommunicationEngine();
