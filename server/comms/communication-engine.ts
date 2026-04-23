import { db } from "../db.js";
import { 
  directMessages, callHistory, meetingRooms, onlineUsers, 
  contacts, groupChats 
} from "../../shared/models/comms";
import { eq, desc, asc, or, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import crypto from "crypto";

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

  constructor() {
    console.log("[Communication Engine] Advanced Communication Engine v1.0 initialized");
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
    
    const [message] = await db.insert(directMessages).values({
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
    }).returning();

    this.messageCount++;

    console.log(`[Comms] Message sent from ${senderId} to ${recipientId || groupId || "broadcast"} (${messageType})`);
    return message;
  }

  async getConversation(userId: string, otherUserId: string, limit: number = 50) {
    return await db.select().from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, userId), eq(directMessages.recipientId, otherUserId)),
          and(eq(directMessages.senderId, otherUserId), eq(directMessages.recipientId, userId))
        )
      )
      .orderBy(asc(directMessages.createdAt))
      .limit(limit);
  }

  async markAsRead(messageId: string, readerId: string) {
    await db.update(directMessages).set({ 
      isRead: true,
      readAt: new Date(),
    }).where(eq(directMessages.id, messageId));
    return { messageId, readerId, readAt: new Date().toISOString() };
  }

  async addReaction(messageId: string, userId: string, reaction: string) {
    const [msg] = await db.select().from(directMessages).where(eq(directMessages.id, messageId)).limit(1);
    if (!msg) return null;
    const reactions = (msg.reactions as Record<string, string[]>) || {};
    if (!reactions[reaction]) reactions[reaction] = [];
    if (!reactions[reaction].includes(userId)) {
      reactions[reaction].push(userId);
    }
    await db.update(directMessages).set({ reactions }).where(eq(directMessages.id, messageId));
    return reactions;
  }

  async getGroupMessages(groupId: string, limit: number = 50) {
    return await db.select().from(directMessages)
      .where(eq(directMessages.groupId, groupId))
      .orderBy(asc(directMessages.createdAt))
      .limit(limit);
  }

  async createGroupChat(name: string, createdBy: string, members: string[]) {
    const allMembers = [createdBy, ...members.filter(m => m !== createdBy)];
    const [group] = await db.insert(groupChats).values({
      name,
      createdBy,
      members: allMembers,
      isEncrypted: true,
    }).returning();
    console.log(`[Comms] Group chat created: ${name} by ${createdBy} (${allMembers.length} members)`);
    return group;
  }

  async getGroupChats(userId: string) {
    const groups = await db.select().from(groupChats);
    return groups.filter(g => {
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

    await db.insert(callHistory).values({
      callerId: initiatorId,
      recipientId,
      roomId,
      callType,
      status: "ringing",
    });

    console.log(`[Comms] Call initiated: ${initiatorName} -> ${recipientId} (${callType})`);
    return call;
  }

  async acceptCall(callId: string, acceptorId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call) return false;

    call.status = "connected";
    call.startedAt = new Date();

    const roomId = `call_${callId.substring(0, 8)}`;
    await db.update(callHistory)
      .set({ status: "connected", startedAt: call.startedAt })
      .where(eq(callHistory.roomId, roomId));

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
    await db.update(callHistory)
      .set({ status: "declined", endedAt: new Date(), declinedBy: [declinerId] })
      .where(eq(callHistory.roomId, roomId));

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
    await db.update(callHistory)
      .set({ status: "ended", endedAt: new Date(), duration: String(duration) })
      .where(eq(callHistory.roomId, roomId));

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

    await db.insert(meetingRooms).values({
      name: title,
      hostId,
      roomCode,
      participants: conference.participants,
      maxParticipants: String(maxParticipants),
      description: description || null,
      password: password || null,
      meetingLink,
    });

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

    await db.update(meetingRooms)
      .set({ participants: conference.participants })
      .where(eq(meetingRooms.roomCode, conference.roomCode));

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

    await db.update(meetingRooms)
      .set({ 
        participants: conference.participants,
        screenSharingBy: conference.screenSharingBy,
      })
      .where(eq(meetingRooms.roomCode, conference.roomCode));

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

    await db.update(meetingRooms)
      .set({ isActive: false, endedAt: new Date(), isRecording: false, screenSharingBy: null })
      .where(eq(meetingRooms.roomCode, conference.roomCode));

    this.activeConferences.delete(conferenceId);
    console.log(`[Comms] Conference "${conference.title}" ended (duration: ${duration}s)`);
    return true;
  }

  async startScreenShare(conferenceId: string, userId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;
    if (conference.screenSharingBy) return false;

    conference.screenSharingBy = userId;

    await db.update(meetingRooms)
      .set({ screenSharingBy: userId })
      .where(eq(meetingRooms.roomCode, conference.roomCode));

    console.log(`[Comms] Screen sharing started in "${conference.title}" by ${userId}`);
    return true;
  }

  async stopScreenShare(conferenceId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;

    conference.screenSharingBy = null;

    await db.update(meetingRooms)
      .set({ screenSharingBy: null })
      .where(eq(meetingRooms.roomCode, conference.roomCode));

    console.log(`[Comms] Screen sharing stopped in "${conference.title}"`);
    return true;
  }

  async toggleRecording(conferenceId: string): Promise<boolean> {
    const conference = this.activeConferences.get(conferenceId);
    if (!conference) return false;

    conference.isRecording = !conference.isRecording;

    await db.update(meetingRooms)
      .set({ isRecording: conference.isRecording })
      .where(eq(meetingRooms.roomCode, conference.roomCode));

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

    await db.insert(onlineUsers).values({
      id: userId,
      displayName,
      isOnline: status !== "offline",
      lastSeen: new Date(),
      status,
    }).onConflictDoUpdate({
      target: onlineUsers.id,
      set: {
        displayName,
        isOnline: status !== "offline",
        lastSeen: new Date(),
        status,
      },
    });

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
      module: "Advanced Communication Engine v1.0",
      status: "operational",
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
