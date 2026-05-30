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

type CallType = "voice" | "video" | "conference" | "screen_share";
type CallStatus = "initiating" | "ringing" | "connected" | "on_hold" | "ended" | "declined" | "missed" | "failed";
type UserStatus = "online" | "away" | "do_not_disturb" | "offline" | "in_call";
type MessageType = "text" | "image" | "video" | "file" | "voice_note" | "system";

interface ActiveCall {
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

interface ActiveConference {
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

interface UserPresence {
  userId: string;
  displayName: string;
  status: UserStatus;
  lastSeen: Date;
  currentCallId: string | null;
  currentConferenceId: string | null;
  networkLatencyMs: number;
  connectionQuality: number;
}

class EncryptionEngine {
  private keys: Map<string, Buffer> = new Map();
  
  generateKey(userId: string): string {
    const key = crypto.randomBytes(32);
    this.keys.set(userId, key);
    return key.toString("hex");
  }

  encrypt(userId: string, message: string): string {
    const key = this.keys.get(userId);
    if (!key) return message;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(message, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  hasKey(userId: string): boolean {
    return this.keys.has(userId);
  }

  decrypt(userId: string, encrypted: string): string {
    const key = this.keys.get(userId);
    if (!key) return encrypted;
    try {
      const [ivHex, data] = encrypted.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(data, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      return encrypted;
    }
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
    fileSizeBytes?: number
  ) {
    const hasKey = this.encryption.hasKey(senderId);
    const isEncrypted = hasKey;
    const storedContent = hasKey ? this.encryption.encrypt(senderId, content) : content;

    const payload = {
      senderId,
      recipientId: recipientId || "broadcast",
      content: storedContent,
      messageType,
      isEncrypted,
      encryptionLevel: isEncrypted ? "aes_256" : "none",
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSizeBytes: fileSizeBytes || null,
      replyToId: replyToId || null,
      groupId: groupId || null,
    };

    // Queue for offline sync regardless — the db-service will also store in fallback
    if (this.isUsingFallback) {
      messageQueue.enqueue("sendMessage", payload as any);
    }

    const result = await dbInsertMessage(payload);
    if (!result.success) {
      console.error(`[CommEngine] sendMessage DB error: ${result.error}`);
    }

    this.messageCount++;
    console.log(`[Comms] Message sent from ${senderId} to ${recipientId || groupId || "broadcast"} (${messageType})`);
    return result.success ? result.data : null;
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
    callType: CallType = "voice"
  ): Promise<ActiveCall> {
    const callId = uuid();
    const roomId = `call_${callId.substring(0, 8)}`;

    const call: ActiveCall = {
      callId,
      callType,
      initiatorId,
      initiatorName,
      participants: [initiatorId, recipientId],
      status: "ringing",
      startedAt: null,
      callQuality: 1.0,
      bandwidthKbps: 0,
      isRecording: false,
    };

    this.activeCalls.set(callId, call);

    const callPayload = { callerId: initiatorId, recipientId, roomId, callType, status: "ringing" };
    if (this.isUsingFallback) {
      messageQueue.enqueue("initiateCall", callPayload as any);
    }
    const result = await dbInsertCall(callPayload);
    if (!result.success) {
      console.error(`[CommEngine] initiateCall DB error: ${result.error}`);
    }

    console.log(`[Comms] Call initiated: ${initiatorName} -> ${recipientId} (${callType})`);
    return call;
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
    const presence: UserPresence = {
      userId,
      displayName,
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
      displayName,
      isOnline: status !== "offline",
      lastSeen: new Date(),
      status,
    };
    if (this.isUsingFallback) {
      messageQueue.enqueue("updatePresence", upsertPayload as any);
    }
    const result = await dbUpsertOnlineUser(upsertPayload);
    if (!result.success) {
      console.error(`[CommEngine] updatePresence DB error: ${result.error}`);
    }

    console.log(`[Comms] Presence updated: ${displayName} -> ${status}`);
    return presence;
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
  getDbStatus() {
    const dbHealth = getDbHealthState();
    const queueMetrics = messageQueue.getMetrics();
    return {
      dbConnected: dbHealth.isHealthy,
      fallbackMode: this.isUsingFallback,
      circuitOpen: dbHealth.circuitOpen,
      consecutiveFailures: dbHealth.consecutiveFailures,
      lastError: dbHealth.lastError,
      errorCategory: dbHealth.errorCategory ?? null,
      lastCheckedAt: dbHealth.lastCheckedAt?.toISOString() ?? null,
      queue: {
        size: queueMetrics.queueSize,
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
    return this.activeConferences.get(conferenceId) || null;
  }

  getCall(callId: string): ActiveCall | null {
    return this.activeCalls.get(callId) || null;
  }

  generateEncryptionKey(userId: string): string {
    return this.encryption.generateKey(userId);
  }
}

export const communicationEngine = new CommunicationEngine();
