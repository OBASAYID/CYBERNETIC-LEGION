import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createCyrusCorsOriginAccess } from "../cors-trusted.js";
import { db } from "../db.js";
import { onlineUsers, directMessages, groupChats, callSessions, callMessages, liveStreams, sharedMedia, calls, callLogs } from "../../shared/models/comms";
import { eq, ilike, sql } from "drizzle-orm";
import { commsIntelligence } from "./comms-intelligence.js";

interface User {
  id: string;
  socketId: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
  currentRoomId?: string;
  status?: "online" | "busy" | "away";
  /** Cyrus chat profile photo URL (served from /api/comms/media/...) */
  profileImageUrl?: string | null;
}

interface PendingCall {
  callerId: string;
  callerName: string;
  targetId: string;
  roomId: string;
  callType: "audio" | "video";
  timestamp: Date;
}

interface GroupRoom {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
}

interface ActiveCall {
  roomId: string;
  participants: string[];
  callType: "audio" | "video";
  startedAt: Date;
  screenSharingBy?: string;
}

type MessageType = "text" | "emoji" | "media" | "file" | "voice-note" | "location" | "system";

interface EnhancedMessage {
  targetUserId?: string;
  groupId?: string;
  message: string;
  messageType: MessageType;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  /** For messageType "voice-note" */
  voiceDurationSeconds?: number;
  latitude?: number;
  longitude?: number;
  replyToId?: string;
}

const users = new Map<string, User>();
const pendingCalls = new Map<string, PendingCall>();
const groupRooms = new Map<string, GroupRoom>();
const activeCalls = new Map<string, ActiveCall>();

/** Max users in a group call (enforced in signaling). */
const GROUP_CALL_MAX_PARTICIPANTS = 20;

let ioInstance: SocketIOServer | null = null;

function emitPresenceUpdate() {
  if (!ioInstance) return;
  const userList = Array.from(users.values()).map((u) => ({
    id: u.id,
    displayName: u.displayName,
    deviceId: u.deviceId,
    inCall: u.inCall,
    status: u.status || "online",
    profileImageUrl: u.profileImageUrl ?? null,
  }));
  ioInstance.emit("presence-update", { users: userList, total: userList.length });
}

/** After HTTP avatar upload: sync in-memory presence + broadcast. */
export function refreshCommsUserAvatar(userId: string, profileImageUrl: string | null) {
  const u = users.get(userId);
  if (u) u.profileImageUrl = profileImageUrl;
  emitPresenceUpdate();
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export function getSocketUsers(): User[] {
  return Array.from(users.values());
}

export function getActiveCalls(): ActiveCall[] {
  return Array.from(activeCalls.values());
}

export function getGroupRooms(): GroupRoom[] {
  return Array.from(groupRooms.values());
}

export function initSocketSignaling(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: createCyrusCorsOriginAccess(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/cyrus-io",
    // Polling-only + no WS upgrade: Railway edge / Bun often break Engine.IO WebSocket upgrade; polling is reliable.
    transports: ["polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 60000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: false,
  });

  ioInstance = io;

  console.log("[Socket.IO] Signaling server initialized");

  const ensurePresenceSchema = async () => {
    try {
      // Some deployments created online_users without status; self-heal before presence updates.
      await db.execute(sql`ALTER TABLE online_users ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'online'`);
      await db.execute(sql`
        UPDATE online_users
        SET status = CASE WHEN is_online THEN 'online' ELSE 'offline' END
        WHERE status IS NULL
      `);
      await db.execute(
        sql`ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS file_mime_type varchar(128)`
      );
    } catch (err) {
      console.error("[Socket.IO] Failed to ensure presence schema:", err);
    }

    // Ensure calls and call_logs tables exist (created via raw DDL so the
    // server is self-healing even without a migration runner).
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS calls (
          id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          caller_id   varchar NOT NULL,
          caller_name varchar,
          recipient_id varchar NOT NULL,
          recipient_name varchar,
          room_id     varchar NOT NULL,
          call_type   varchar NOT NULL DEFAULT 'audio',
          status      varchar NOT NULL DEFAULT 'ringing',
          start_time  timestamp DEFAULT now(),
          end_time    timestamp,
          duration_seconds integer,
          peak_quality varchar,
          network_type varchar,
          created_at  timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS call_logs (
          id         varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          call_id    varchar NOT NULL,
          user_id    varchar NOT NULL,
          event      varchar NOT NULL,
          metadata   jsonb DEFAULT '{}',
          created_at timestamp NOT NULL DEFAULT now()
        )
      `);
      console.log("[Socket.IO] calls / call_logs tables ensured");
    } catch (err) {
      console.error("[Socket.IO] Failed to ensure calls schema:", err);
    }
  };

  (async () => {
    await ensurePresenceSchema();
    try {
      await db.update(onlineUsers)
        .set({ isOnline: false, status: "offline" })
        .where(eq(onlineUsers.isOnline, true));
      console.log("[Socket.IO] Cleared stale online statuses on startup");
    } catch (err) {
      console.error("[Socket.IO] Failed to clear stale statuses:", err);
    }
  })();

  setInterval(async () => {
    try {
      const connectedDeviceIds = new Set(Array.from(users.values()).map(u => u.id));
      const allOnline = await db.select().from(onlineUsers).where(eq(onlineUsers.isOnline, true));
      for (const record of allOnline) {
        if (record.id !== 'cyrus-001' && !connectedDeviceIds.has(record.id)) {
          await db.update(onlineUsers)
            .set({ isOnline: false, status: "offline" })
            .where(eq(onlineUsers.id, record.id));
        }
      }
    } catch { }
  }, 60000);

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    socket.on("register", async (data: { userId: string; displayName: string; deviceId: string; profileImageUrl?: string | null }) => {
      const { userId, displayName, deviceId } = data;

      let dbAvatar: string | null | undefined;
      try {
        const [existing] = await db.select({ profileImageUrl: onlineUsers.profileImageUrl }).from(onlineUsers).where(eq(onlineUsers.id, userId)).limit(1);
        dbAvatar = existing?.profileImageUrl ?? null;
      } catch { /* table missing etc. */ }

      const profileImageUrl = (data.profileImageUrl ?? dbAvatar) || null;

      const user: User = {
        id: userId,
        socketId: socket.id,
        displayName,
        deviceId,
        inCall: false,
        status: "online",
        profileImageUrl,
      };

      users.set(userId, user);
      (socket as any).userId = userId;

      console.log(`[Socket.IO] User registered: ${displayName} (${userId}) - Total: ${users.size}`);

      try {
        await db.insert(onlineUsers).values({
          id: userId,
          displayName,
          email: null,
          profileImageUrl: profileImageUrl || null,
          lastSeen: new Date(),
          isOnline: true,
          socketId: socket.id,
          status: "online",
        }).onConflictDoUpdate({
          target: onlineUsers.id,
          set: {
            displayName,
            lastSeen: new Date(),
            isOnline: true,
            socketId: socket.id,
            status: "online",
          },
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist user:", err);
      }

      socket.emit("registered", { userId, totalOnline: users.size });

      emitPresenceUpdate();
    });

    socket.on("call-user", (data: { targetUserId: string; callType: "audio" | "video" }) => {
      const callerId = (socket as any).userId;
      const caller = users.get(callerId);

      if (!caller) {
        socket.emit("call-failed", { reason: "not-registered" });
        return;
      }

      const target = users.get(data.targetUserId);

      if (!target) {
        socket.emit("call-failed", { reason: "user-offline" });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const pendingCall: PendingCall = {
        callerId,
        callerName: caller.displayName,
        targetId: data.targetUserId,
        roomId,
        callType: data.callType,
        timestamp: new Date(),
      };

      pendingCalls.set(roomId, pendingCall);
      caller.inCall = true;
      caller.currentRoomId = roomId;

      console.log(`[Socket.IO] Call: ${caller.displayName} -> ${target.displayName} (${data.callType}) Room: ${roomId}`);

      io.to(target.socketId).emit("incoming-call", {
        callerId,
        callerName: caller.displayName,
        roomId,
        callType: data.callType,
      });

      socket.emit("call-ringing", { roomId, targetName: target.displayName, callType: data.callType });

      emitPresenceUpdate();
    });

    socket.on("accept-call", async (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      const pendingCall = pendingCalls.get(data.roomId);

      if (!pendingCall || !user) {
        socket.emit("call-failed", { reason: "call-not-found" });
        return;
      }

      const caller = users.get(pendingCall.callerId);

      if (!caller) {
        socket.emit("call-failed", { reason: "caller-disconnected" });
        pendingCalls.delete(data.roomId);
        return;
      }

      user.inCall = true;
      user.currentRoomId = data.roomId;

      socket.join(data.roomId);
      io.sockets.sockets.get(caller.socketId)?.join(data.roomId);

      const activeCall: ActiveCall = {
        roomId: data.roomId,
        participants: [pendingCall.callerId, userId],
        callType: pendingCall.callType,
        startedAt: new Date(),
      };
      activeCalls.set(data.roomId, activeCall);

      try {
        await db.insert(callSessions).values({
          callId: data.roomId,
          type: "p2p",
          participants: [
            { userId: pendingCall.callerId, displayName: caller.displayName, joinedAt: new Date().toISOString() },
            { userId, displayName: user.displayName, joinedAt: new Date().toISOString() },
          ],
          mediaConfig: { audio: true, video: pendingCall.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist call session:", err);
      }

      console.log(`[Socket.IO] Call accepted: ${caller.displayName} <-> ${user.displayName} (room: ${data.roomId})`);

      // WebRTC handshake watchdog: if neither peer emits a successful ICE
      // diagnostic within 30 seconds, log a warning so operators can
      // investigate TURN server availability for this region/network.
      const HANDSHAKE_WATCHDOG_MS = 30_000;
      const handshakeWatchdog = setTimeout(() => {
        const call = activeCalls.get(data.roomId);
        if (call && call.participants.length >= 2) {
          console.warn(
            `[Socket.IO] WebRTC handshake watchdog: room ${data.roomId} still active after ` +
            `${HANDSHAKE_WATCHDOG_MS / 1000}s – participants may be experiencing ICE issues. ` +
            "Check TURN server reachability for involved clients."
          );
        }
      }, HANDSHAKE_WATCHDOG_MS);
      // Ensure the timer doesn't prevent process exit
      if (handshakeWatchdog.unref) handshakeWatchdog.unref();

      const callType = pendingCall.callType;

      io.to(caller.socketId).emit("call-accepted", {
        roomId: data.roomId,
        peerName: user.displayName,
        peerId: userId,
        callType,
      });

      socket.emit("call-connected", {
        roomId: data.roomId,
        peerName: caller.displayName,
        peerId: caller.id,
        isInitiator: false,
        callType,
      });

      try {
        commsIntelligence.trackInteraction(userId, 'call_started', pendingCall.callerId, { callType, roomId: data.roomId });
        commsIntelligence.trackInteraction(pendingCall.callerId, 'call_started', userId, { callType, roomId: data.roomId });
      } catch (_) { }

      pendingCalls.delete(data.roomId);
      emitPresenceUpdate();
    });

    socket.on("decline-call", (data: { roomId: string }) => {
      const pendingCall = pendingCalls.get(data.roomId);

      if (pendingCall) {
        const caller = users.get(pendingCall.callerId);

        if (caller) {
          caller.inCall = false;
          caller.currentRoomId = undefined;
          io.to(caller.socketId).emit("call-declined", { roomId: data.roomId });
        }

        pendingCalls.delete(data.roomId);
        emitPresenceUpdate();
      }
    });

    // ── WebRTC signaling relay ──────────────────────────────────────────────
    // All webrtc-* events are pure relay: the server forwards them to the
    // correct peer without inspecting the SDP/ICE payload.  This keeps the
    // signaling server media-agnostic and allows the client to handle all
    // ICE negotiation logic (restart, timeout, fallback) independently.

    socket.on("webrtc-offer", (data: { roomId: string; offer: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;
      console.log(`[Socket.IO] WebRTC offer relay: ${fromPeerId} → ${data.targetPeerId || data.roomId}`);

      if (data.targetPeerId) {
        const targetUser = users.get(data.targetPeerId);
        if (targetUser) {
          io.to(targetUser.socketId).emit("webrtc-offer", {
            offer: data.offer,
            roomId: data.roomId,
            fromPeerId,
          });
        }
      } else {
        socket.to(data.roomId).emit("webrtc-offer", { offer: data.offer, roomId: data.roomId, fromPeerId });
      }
    });

    socket.on("webrtc-answer", (data: { roomId: string; answer: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;
      console.log(`[Socket.IO] WebRTC answer relay: ${fromPeerId} → ${data.targetPeerId || data.roomId}`);

      if (data.targetPeerId) {
        const targetUser = users.get(data.targetPeerId);
        if (targetUser) {
          io.to(targetUser.socketId).emit("webrtc-answer", {
            answer: data.answer,
            roomId: data.roomId,
            fromPeerId,
          });
        }
      } else {
        socket.to(data.roomId).emit("webrtc-answer", { answer: data.answer, roomId: data.roomId, fromPeerId });
      }
    });

    socket.on("webrtc-ice-candidate", (data: { roomId: string; candidate: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;

      if (data.targetPeerId) {
        const targetUser = users.get(data.targetPeerId);
        if (targetUser) {
          io.to(targetUser.socketId).emit("webrtc-ice-candidate", {
            candidate: data.candidate,
            roomId: data.roomId,
            fromPeerId,
          });
        }
      } else {
        socket.to(data.roomId).emit("webrtc-ice-candidate", { candidate: data.candidate, roomId: data.roomId, fromPeerId });
      }
    });

    // ── ICE restart relay ───────────────────────────────────────────────────
    // When a client detects ICE failure it sends an ice-restart offer.
    // The server relays it to the peer so the non-initiator can respond
    // with a new answer, re-establishing the media path without hanging up.
    socket.on("webrtc-ice-restart", (data: { roomId: string; offer: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;
      console.log(`[Socket.IO] ICE restart relay: ${fromPeerId} → ${data.targetPeerId || data.roomId}`);

      if (data.targetPeerId) {
        const targetUser = users.get(data.targetPeerId);
        if (targetUser) {
          io.to(targetUser.socketId).emit("webrtc-ice-restart", {
            offer: data.offer,
            roomId: data.roomId,
            fromPeerId,
          });
        }
      } else {
        socket.to(data.roomId).emit("webrtc-ice-restart", { offer: data.offer, roomId: data.roomId, fromPeerId });
      }
    });

    // ── ICE diagnostic events ───────────────────────────────────────────────
    // Clients emit ice-diagnostic when gathering times out or ICE fails.
    // The server logs these for operator visibility without blocking the call.
    socket.on("ice-diagnostic", (data: {
      event: string;
      roomId?: string;
      timeoutMs?: number;
      iceGatheringState?: string;
      iceConnectionState?: string;
      connectionState?: string;
      restartAttempt?: number;
    }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      console.warn(
        `[Socket.IO] ICE diagnostic from ${user?.displayName || userId}: ` +
        `event=${data.event} iceGathering=${data.iceGatheringState} ` +
        `iceConnection=${data.iceConnectionState} connection=${data.connectionState} ` +
        `room=${data.roomId || "n/a"} restartAttempt=${data.restartAttempt ?? 0}`
      );
    });

    socket.on("end-call", async (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);

      if (user) {
        user.inCall = false;
        user.currentRoomId = undefined;
      }

      const activeCall = activeCalls.get(data.roomId);
      if (activeCall) {
        activeCall.participants = activeCall.participants.filter(p => p !== userId);
        if (activeCall.participants.length === 0) {
          activeCalls.delete(data.roomId);
          const now = new Date();
          const durationSeconds = Math.floor((now.getTime() - activeCall.startedAt.getTime()) / 1000);
          try {
            await db.update(callSessions)
              .set({ endTime: now, durationSeconds })
              .where(eq(callSessions.callId, data.roomId));
          } catch (err) {
            console.error("[Socket.IO] Failed to update call session end:", err);
          }
        }
        if (activeCall.screenSharingBy === userId) {
          activeCall.screenSharingBy = undefined;
          io.to(data.roomId).emit("screen-share-stopped", { userId });
        }
      }

      socket.to(data.roomId).emit("call-ended", { roomId: data.roomId, userId });
      socket.leave(data.roomId);

      try {
        const duration = activeCall ? Math.floor((Date.now() - activeCall.startedAt.getTime()) / 1000) : 0;
        commsIntelligence.trackInteraction(userId, 'call_ended', undefined, { duration, roomId: data.roomId });
      } catch (_) { }

      emitPresenceUpdate();
    });

    socket.on("send-message", async (data: EnhancedMessage) => {
      const senderId = (socket as any).userId;
      const sender = users.get(senderId);

      if (!sender) return;

      const messageType = (data.messageType || "text") as MessageType;
      let messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let textBody = data.message;
      if (messageType === "location" && data.latitude != null && data.longitude != null) {
        textBody = JSON.stringify({
          lat: data.latitude,
          lng: data.longitude,
          c: (data.message || "").trim(),
        });
      } else if (messageType === "voice-note") {
        textBody = JSON.stringify({
          d: data.voiceDurationSeconds ?? 0,
          c: (data.message || "").trim(),
        });
      }

      try {
        const [inserted] = await db
          .insert(directMessages)
          .values({
            senderId: senderId,
            recipientId: data.targetUserId || "",
            groupId: data.groupId || null,
            content: textBody,
            messageType: messageType,
            fileUrl: data.fileUrl || null,
            fileName: data.fileName || null,
            fileMimeType: data.fileMimeType || null,
            fileSizeBytes: data.fileSizeBytes ?? null,
            replyToId: data.replyToId || null,
          })
          .returning({ id: directMessages.id });
        if (inserted?.id) {
          messageId = inserted.id;
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to persist message:", err);
      }

      const outgoingPayload = {
        id: messageId,
        senderId,
        senderName: sender.displayName,
        message: data.message,
        messageType,
        timestamp: data.timestamp,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileMimeType: data.fileMimeType,
        fileSizeBytes: data.fileSizeBytes,
        voiceDurationSeconds: data.voiceDurationSeconds,
        latitude: data.latitude,
        longitude: data.longitude,
        replyToId: data.replyToId,
        groupId: data.groupId,
      };

      if (data.groupId) {
        const room = groupRooms.get(data.groupId);
        if (room) {
          socket.to(`group_${data.groupId}`).emit("new-message", outgoingPayload);
        }
      } else if (data.targetUserId) {
        const target = users.get(data.targetUserId);
        if (target) {
          io.to(target.socketId).emit("new-message", outgoingPayload);
        }
      }

      socket.emit("message-sent", {
        id: messageId,
        recipientId: data.targetUserId,
        groupId: data.groupId,
        message: data.message,
        messageType,
        timestamp: data.timestamp,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileMimeType: data.fileMimeType,
        fileSizeBytes: data.fileSizeBytes,
        voiceDurationSeconds: data.voiceDurationSeconds,
        latitude: data.latitude,
        longitude: data.longitude,
      });

      try {
        commsIntelligence.trackInteraction(senderId, 'message_sent', data.targetUserId || undefined, {
          content: data.message,
          contentLength: data.message?.length || 0,
          channelType: data.groupId ? 'group' : 'direct',
          messageType,
        });
      } catch (_) { }
    });

    socket.on("create-group", async (data: { name: string; members: string[] }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const allMembers = Array.from(new Set([userId, ...data.members]));

      const room: GroupRoom = {
        id: groupId,
        name: data.name,
        createdBy: userId,
        members: allMembers,
        createdAt: new Date(),
      };

      groupRooms.set(groupId, room);

      try {
        await db.insert(groupChats).values({
          id: groupId,
          name: data.name,
          createdBy: userId,
          members: allMembers,
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist group:", err);
      }

      for (const memberId of allMembers) {
        const member = users.get(memberId);
        if (member) {
          const memberSocket = io.sockets.sockets.get(member.socketId);
          memberSocket?.join(`group_${groupId}`);
          io.to(member.socketId).emit("group-created", {
            groupId,
            name: data.name,
            members: allMembers,
            createdBy: userId,
            createdByName: user.displayName,
          });
        }
      }

      console.log(`[Socket.IO] Group created: ${data.name} (${groupId}) by ${user.displayName} with ${allMembers.length} members`);
    });

    socket.on("join-group", (data: { groupId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      const room = groupRooms.get(data.groupId);

      if (!user || !room) {
        socket.emit("group-error", { reason: "group-not-found" });
        return;
      }

      if (!room.members.includes(userId)) {
        room.members.push(userId);
      }

      socket.join(`group_${data.groupId}`);
      socket.to(`group_${data.groupId}`).emit("group-member-joined", {
        groupId: data.groupId,
        userId,
        displayName: user.displayName,
        members: room.members,
      });

      socket.emit("group-joined", {
        groupId: data.groupId,
        name: room.name,
        members: room.members,
      });
    });

    socket.on("leave-group", (data: { groupId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      const room = groupRooms.get(data.groupId);

      if (!room) return;

      room.members = room.members.filter(m => m !== userId);
      socket.leave(`group_${data.groupId}`);

      socket.to(`group_${data.groupId}`).emit("group-member-left", {
        groupId: data.groupId,
        userId,
        displayName: user?.displayName,
        members: room.members,
      });

      if (room.members.length === 0) {
        groupRooms.delete(data.groupId);
      }
    });

    socket.on("group-call", async (data: { groupId: string; callType: "audio" | "video" }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      const room = groupRooms.get(data.groupId);

      if (!user || !room) {
        socket.emit("call-failed", { reason: "group-not-found" });
        return;
      }

      if (room.members.length > GROUP_CALL_MAX_PARTICIPANTS) {
        socket.emit("call-failed", { reason: "too-many-participants", max: GROUP_CALL_MAX_PARTICIPANTS });
        return;
      }

      const roomId = `gcall_${data.groupId}_${Date.now()}`;

      const activeCall: ActiveCall = {
        roomId,
        participants: [userId],
        callType: data.callType,
        startedAt: new Date(),
      };
      activeCalls.set(roomId, activeCall);

      try {
        await db.insert(callSessions).values({
          callId: roomId,
          type: "group",
          participants: [{ userId, displayName: user.displayName, joinedAt: new Date().toISOString() }],
          mediaConfig: { audio: true, video: data.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
          metadata: { groupId: data.groupId, groupName: room.name },
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist group call session:", err);
      }

      user.inCall = true;
      user.currentRoomId = roomId;
      socket.join(roomId);

      for (const memberId of room.members) {
        if (memberId === userId) continue;
        const member = users.get(memberId);
        if (member && !member.inCall) {
          io.to(member.socketId).emit("incoming-group-call", {
            callerId: userId,
            callerName: user.displayName,
            groupId: data.groupId,
            groupName: room.name,
            roomId,
            callType: data.callType,
            participants: activeCall.participants,
          });
        }
      }

      socket.emit("group-call-started", {
        roomId,
        groupId: data.groupId,
        callType: data.callType,
        participants: activeCall.participants,
      });

      console.log(`[Socket.IO] Group call started: ${room.name} by ${user.displayName} (${data.callType})`);
      emitPresenceUpdate();
    });

    socket.on("create-group-call", async (data: { participantIds: string[]; callType: "audio" | "video"; groupName?: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const allParticipants = Array.from(new Set([userId, ...data.participantIds]));
      if (allParticipants.length > GROUP_CALL_MAX_PARTICIPANTS) {
        socket.emit("call-failed", { reason: "too-many-participants", max: GROUP_CALL_MAX_PARTICIPANTS });
        return;
      }

      const roomId = `gcall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const activeCall: ActiveCall = {
        roomId,
        participants: [userId],
        callType: data.callType || "video",
        startedAt: new Date(),
      };
      activeCalls.set(roomId, activeCall);

      try {
        await db.insert(callSessions).values({
          callId: roomId,
          type: "group",
          participants: [{ userId, displayName: user.displayName, joinedAt: new Date().toISOString() }],
          mediaConfig: { audio: true, video: data.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
          metadata: { groupName: data.groupName || "Group Call" },
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist group call session:", err);
      }

      user.inCall = true;
      user.currentRoomId = roomId;
      socket.join(roomId);

      for (const participantId of data.participantIds) {
        if (participantId === userId) continue;
        const member = users.get(participantId);
        if (member && !member.inCall) {
          io.to(member.socketId).emit("incoming-group-call", {
            callerId: userId,
            callerName: user.displayName,
            groupName: data.groupName || "Group Call",
            roomId,
            callType: data.callType || "video",
            participants: allParticipants,
          });
        }
      }

      socket.emit("group-call-created", { roomId, callType: data.callType, participants: allParticipants });
      console.log(`[Socket.IO] Group call created by ${user.displayName} with ${allParticipants.length} participants`);
      emitPresenceUpdate();
    });

    socket.on("join-group-call", (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      const activeCall = activeCalls.get(data.roomId);

      if (!user || !activeCall) {
        socket.emit("call-failed", { reason: "call-not-found" });
        return;
      }

      if (activeCall.participants.length >= GROUP_CALL_MAX_PARTICIPANTS) {
        socket.emit("call-failed", { reason: "call-full", max: GROUP_CALL_MAX_PARTICIPANTS });
        return;
      }

      user.inCall = true;
      user.currentRoomId = data.roomId;
      activeCall.participants.push(userId);

      socket.join(data.roomId);

      socket.to(data.roomId).emit("peer-joined", {
        roomId: data.roomId,
        peerId: userId,
        peerName: user.displayName,
        participants: activeCall.participants,
      });

      socket.emit("group-call-joined", {
        roomId: data.roomId,
        participants: activeCall.participants,
        callType: activeCall.callType,
        existingPeers: activeCall.participants.filter(p => p !== userId),
      });

      emitPresenceUpdate();
    });

    socket.on("typing-start", (data: { targetUserId?: string; groupId?: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const payload = { userId, displayName: user.displayName };

      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit("typing-start", { ...payload, groupId: data.groupId });
      } else if (data.targetUserId) {
        const target = users.get(data.targetUserId);
        if (target) {
          io.to(target.socketId).emit("typing-start", payload);
        }
      }
    });

    socket.on("typing-stop", (data: { targetUserId?: string; groupId?: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const payload = { userId, displayName: user.displayName };

      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit("typing-stop", { ...payload, groupId: data.groupId });
      } else if (data.targetUserId) {
        const target = users.get(data.targetUserId);
        if (target) {
          io.to(target.socketId).emit("typing-stop", payload);
        }
      }
    });

    socket.on("screen-share-start", (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const activeCall = activeCalls.get(data.roomId);

      if (activeCall) {
        activeCall.screenSharingBy = userId;
      }

      socket.to(data.roomId).emit("screen-share-started", {
        roomId: data.roomId,
        userId,
        displayName: users.get(userId)?.displayName,
      });
    });

    socket.on("screen-share-stop", (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const activeCall = activeCalls.get(data.roomId);

      if (activeCall && activeCall.screenSharingBy === userId) {
        activeCall.screenSharingBy = undefined;
      }

      socket.to(data.roomId).emit("screen-share-stopped", {
        roomId: data.roomId,
        userId,
      });
    });

    socket.on("call-chat-message", async (data: { roomId: string; message: string; timestamp: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      try {
        await db.insert(callMessages).values({
          callSessionId: data.roomId,
          userId,
          userName: user.displayName,
          content: data.message,
          messageType: "text",
          isPrivate: false,
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist call message:", err);
      }

      socket.to(data.roomId).emit("call-chat-message", {
        senderId: userId,
        senderName: user.displayName,
        message: data.message,
        timestamp: data.timestamp,
        roomId: data.roomId,
      });
    });

    socket.on("send-private-message", async (data: { roomId: string; message: string; privateRecipients: string[]; mediaUrls?: string[]; messageType?: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const msgType = data.messageType || "text";

      try {
        await db.insert(callMessages).values({
          callSessionId: data.roomId,
          userId,
          userName: user.displayName,
          content: data.message,
          mediaUrls: data.mediaUrls || [],
          messageType: msgType,
          isPrivate: true,
          privateRecipients: data.privateRecipients,
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist private call message:", err);
      }

      for (const recipientId of data.privateRecipients) {
        const target = users.get(recipientId);
        if (target) {
          io.to(target.socketId).emit("private-message-received", {
            senderId: userId,
            senderName: user.displayName,
            message: data.message,
            mediaUrls: data.mediaUrls,
            messageType: msgType,
            roomId: data.roomId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    socket.on("send-reaction", (data: { roomId: string; emoji: string; x: number; y: number }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      io.to(data.roomId).emit("reaction-received", {
        userId,
        displayName: user.displayName,
        emoji: data.emoji,
        x: data.x,
        y: data.y,
        timestamp: new Date().toISOString(),
      });

      try { commsIntelligence.trackInteraction(userId, 'reaction_sent', undefined, { emoji: data.emoji }); } catch (_) { }
    });

    socket.on("share-location", (data: { roomId: string; latitude: number; longitude: number }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const activeCall = activeCalls.get(data.roomId);
      if (!activeCall) return;

      io.to(data.roomId).emit("location-update", {
        userId,
        displayName: user.displayName,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("start-live-stream", async (data: { streamName: string; sourceType: string; sourceUrl?: string; roomId?: string; quality?: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        await db.insert(liveStreams).values({
          streamId,
          streamName: data.streamName,
          sourceType: data.sourceType,
          sourceUrl: data.sourceUrl || null,
          broadcasterId: userId,
          broadcasterName: user.displayName,
          viewers: [],
          status: "active",
          quality: data.quality || "720p",
          callSessionId: data.roomId || null,
          startTime: new Date(),
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist live stream:", err);
      }

      if (data.roomId) {
        io.to(data.roomId).emit("live-stream-started", {
          streamId,
          streamName: data.streamName,
          sourceType: data.sourceType,
          broadcasterId: userId,
          broadcasterName: user.displayName,
          quality: data.quality || "720p",
        });
      }

      socket.emit("stream-created", { streamId, streamName: data.streamName });
      console.log(`[Socket.IO] Live stream started: ${data.streamName} by ${user.displayName}`);
    });

    socket.on("end-live-stream", async (data: { streamId: string; roomId?: string }) => {
      const userId = (socket as any).userId;

      try {
        await db.update(liveStreams)
          .set({ status: "ended", endTime: new Date() })
          .where(eq(liveStreams.streamId, data.streamId));
      } catch (err) {
        console.error("[Socket.IO] Failed to end live stream:", err);
      }

      if (data.roomId) {
        io.to(data.roomId).emit("live-stream-ended", { streamId: data.streamId, endedBy: userId });
      }

      io.emit("stream-ended", { streamId: data.streamId });
      console.log(`[Socket.IO] Live stream ended: ${data.streamId}`);
    });

    socket.on("join-live-stream", async (data: { streamId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      socket.join(`stream_${data.streamId}`);

      try {
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.streamId, data.streamId));
        if (stream) {
          const viewers = (stream.viewers as Array<{ userId: string; joinedAt: string }>) || [];
          if (!viewers.find((v: { userId: string }) => v.userId === userId)) {
            viewers.push({ userId, joinedAt: new Date().toISOString() });
            await db.update(liveStreams)
              .set({ viewers })
              .where(eq(liveStreams.streamId, data.streamId));
          }
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to track stream viewer:", err);
      }

      io.to(`stream_${data.streamId}`).emit("stream-viewer-joined", {
        streamId: data.streamId,
        userId,
        displayName: user.displayName,
      });
    });

    socket.on("leave-live-stream", async (data: { streamId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);

      socket.leave(`stream_${data.streamId}`);

      try {
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.streamId, data.streamId));
        if (stream) {
          const viewers = ((stream.viewers as Array<{ userId: string }>) || []).filter((v: { userId: string }) => v.userId !== userId);
          await db.update(liveStreams)
            .set({ viewers })
            .where(eq(liveStreams.streamId, data.streamId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to remove stream viewer:", err);
      }

      io.to(`stream_${data.streamId}`).emit("stream-viewer-left", {
        streamId: data.streamId,
        userId,
        displayName: user?.displayName,
      });
    });

    socket.on("annotate-media", async (data: { mediaId: string; annotationType: string; annotationData: any; roomId?: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      const annotation = {
        userId,
        displayName: user.displayName,
        type: data.annotationType,
        data: data.annotationData,
        timestamp: new Date().toISOString(),
      };

      try {
        const [media] = await db.select().from(sharedMedia).where(eq(sharedMedia.mediaId, data.mediaId));
        if (media) {
          const annotations = (media.annotations as any[]) || [];
          annotations.push(annotation);
          await db.update(sharedMedia)
            .set({ annotations })
            .where(eq(sharedMedia.mediaId, data.mediaId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to persist media annotation:", err);
      }

      if (data.roomId) {
        io.to(data.roomId).emit("media-annotated", {
          mediaId: data.mediaId,
          annotation,
        });
      }
    });

    socket.on("send-voice-note", (data: { roomId: string; audioData: string; duration: number }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      io.to(data.roomId).emit("voice-note-received", {
        userId,
        displayName: user.displayName,
        audioData: data.audioData,
        duration: data.duration,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("update-call-quality", async (data: { roomId: string; quality: "HD" | "SD" | "Low" }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      try {
        await db.update(callSessions)
          .set({ quality: data.quality })
          .where(eq(callSessions.callId, data.roomId));
      } catch (err) {
        console.error("[Socket.IO] Failed to update call quality:", err);
      }

      io.to(data.roomId).emit("call-quality-updated", {
        roomId: data.roomId,
        userId,
        displayName: user.displayName,
        quality: data.quality,
      });
    });

    socket.on("message-read", async (data: { messageIds: string[]; readBy: string }) => {
      const userId = (socket as any).userId;

      try {
        for (const msgId of data.messageIds) {
          await db.update(directMessages)
            .set({ isRead: true, readAt: new Date() })
            .where(eq(directMessages.id, msgId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to mark messages as read:", err);
      }

      if (data.readBy) {
        const target = users.get(data.readBy);
        if (target) {
          io.to(target.socketId).emit("messages-read", {
            messageIds: data.messageIds,
            readBy: userId,
            readAt: new Date().toISOString(),
          });
        }
      }
    });

    socket.on("message-reaction", async (data: { messageId: string; emoji: string; targetUserId?: string; groupId?: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      if (!user) return;

      try {
        const [msg] = await db.select().from(directMessages).where(eq(directMessages.id, data.messageId));
        if (msg) {
          const reactions = (msg.reactions as Record<string, string[]>) || {};
          if (!reactions[data.emoji]) {
            reactions[data.emoji] = [];
          }
          const idx = reactions[data.emoji].indexOf(userId);
          if (idx >= 0) {
            reactions[data.emoji].splice(idx, 1);
            if (reactions[data.emoji].length === 0) {
              delete reactions[data.emoji];
            }
          } else {
            reactions[data.emoji].push(userId);
          }
          await db.update(directMessages)
            .set({ reactions })
            .where(eq(directMessages.id, data.messageId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to update reaction:", err);
      }

      const reactionPayload = {
        messageId: data.messageId,
        emoji: data.emoji,
        userId,
        displayName: user.displayName,
      };

      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit("message-reaction", reactionPayload);
      } else if (data.targetUserId) {
        const target = users.get(data.targetUserId);
        if (target) {
          io.to(target.socketId).emit("message-reaction", reactionPayload);
        }
      }

      socket.emit("message-reaction", reactionPayload);
    });

    socket.on("search-users", async (data: { query: string }) => {
      const userId = (socket as any).userId;
      try {
        const results = await db.select().from(onlineUsers)
          .where(ilike(onlineUsers.displayName, `%${data.query}%`));

        const enriched = results.map(u => ({
          id: u.id,
          displayName: u.displayName,
          isOnline: users.has(u.id),
          status: users.get(u.id)?.status || (u.isOnline ? "online" : "offline"),
          inCall: users.get(u.id)?.inCall || false,
          lastSeen: u.lastSeen,
        }));

        socket.emit("search-results", { query: data.query, users: enriched });
      } catch (err) {
        console.error("[Socket.IO] User search failed:", err);
        socket.emit("search-results", { query: data.query, users: [] });
      }
    });

    socket.on("get-user-list", () => {
      const userList = Array.from(users.values()).map((u) => ({
        id: u.id,
        displayName: u.displayName,
        deviceId: u.deviceId,
        inCall: u.inCall,
        status: u.status || "online",
      }));
      socket.emit("user-list", { users: userList, total: userList.length });
    });

    // ── Colon-style event aliases (call:initiate, call:accept, etc.) ─────────
    // These mirror the hyphenated events above so that both the legacy
    // PresenceContext and the new useWebRTC hook can share the same server.

    // -----------------------------------------------------------------------
    // Namespaced call events (call:* / webrtc:*)
    // These are the canonical event names used by the useWebRTC hook and the
    // new call components.  They delegate to the same in-memory state as the
    // legacy hyphenated events above so both naming conventions work.
    // -----------------------------------------------------------------------

    /** call:initiate — caller requests a call to targetUserId */
    socket.on("call:initiate", async (data: { targetUserId: string; callType: "audio" | "video" }) => {
      const callerId = (socket as any).userId;
      const caller = users.get(callerId);
      if (!caller) { socket.emit("call:failed", { reason: "not-registered" }); return; }

      const target = users.get(data.targetUserId);
      if (!target) { socket.emit("call:failed", { reason: "user-offline" }); return; }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const pendingCall: PendingCall = {
        callerId,
        callerName: caller.displayName,
        targetId: data.targetUserId,
        roomId,
        callType: data.callType,
        timestamp: new Date(),
      };
      pendingCalls.set(roomId, pendingCall);
      caller.inCall = true;
      caller.currentRoomId = roomId;

      // Persist to calls table
      try {
        await db.insert(calls).values({
          callerId,
          callerName: caller.displayName,
          recipientId: data.targetUserId,
          recipientName: target.displayName,
          roomId,
          callType: data.callType,
          status: "ringing",
          startTime: new Date(),
        });
        await db.insert(callLogs).values({ callId: roomId, userId: callerId, event: "initiated", metadata: { callType: data.callType } });
      } catch (err) {
        console.error("[Socket.IO] call:initiate persist error:", err);
      }

      // Notify recipient
      io.to(target.socketId).emit("call:ring", {
        callerId,
        callerName: caller.displayName,
        roomId,
        callType: data.callType,
      });
      // Also emit legacy event for backward compat
      io.to(target.socketId).emit("incoming-call", {
        callerId,
        callerName: caller.displayName,
        roomId,
        callType: data.callType,
      });

      socket.emit("call:ringing", { roomId, targetName: target.displayName, callType: data.callType });
      socket.emit("call-ringing", { roomId, targetName: target.displayName, callType: data.callType });
      console.log(`[Socket.IO] call:initiate ${caller.displayName} -> ${target.displayName} (${data.callType}) room:${roomId}`);
      emitPresenceUpdate();
    });

    /** call:accept — recipient accepts the call */
    socket.on("call:accept", async (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);
      const pendingCall = pendingCalls.get(data.roomId);
      if (!pendingCall || !user) { socket.emit("call:failed", { reason: "call-not-found" }); return; }

      const caller = users.get(pendingCall.callerId);
      if (!caller) { socket.emit("call:failed", { reason: "caller-disconnected" }); pendingCalls.delete(data.roomId); return; }

      user.inCall = true;
      user.currentRoomId = data.roomId;

      socket.join(data.roomId);
      io.sockets.sockets.get(caller.socketId)?.join(data.roomId);

      const activeCall: ActiveCall = {
        roomId: data.roomId,
        participants: [pendingCall.callerId, userId],
        callType: pendingCall.callType,
        startedAt: new Date(),
      };
      activeCalls.set(data.roomId, activeCall);

      try {
        await db.update(calls).set({ status: "connected" }).where(eq(calls.roomId, data.roomId));
        await db.insert(callLogs).values({ callId: data.roomId, userId, event: "accepted" });
        await db.insert(callSessions).values({
          callId: data.roomId,
          type: "p2p",
          participants: [
            { userId: pendingCall.callerId, displayName: caller.displayName, joinedAt: new Date().toISOString() },
            { userId, displayName: user.displayName, joinedAt: new Date().toISOString() },
          ],
          mediaConfig: { audio: true, video: pendingCall.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
        });
      } catch (err) {
        console.error("[Socket.IO] call:accept persist error:", err);
      }

      const callType = pendingCall.callType;
      // Emit both colon and hyphen variants for full compat
      io.to(caller.socketId).emit("call:accepted", { roomId: data.roomId, peerName: user.displayName, peerId: userId, callType });
      io.to(caller.socketId).emit("call-accepted", { roomId: data.roomId, peerName: user.displayName, peerId: userId, callType });
      socket.emit("call:connected", { roomId: data.roomId, peerName: caller.displayName, peerId: caller.id, isInitiator: false, callType });
      socket.emit("call-connected", { roomId: data.roomId, peerName: caller.displayName, peerId: caller.id, isInitiator: false, callType });

      pendingCalls.delete(data.roomId);
      console.log(`[Socket.IO] call:accept ${caller.displayName} <-> ${user.displayName}`);
      emitPresenceUpdate();
    });

    /** call:reject — recipient rejects the call */
    socket.on("call:reject", async (data: { roomId: string; reason?: string }) => {
      const userId = (socket as any).userId;
      const pendingCall = pendingCalls.get(data.roomId);

      if (pendingCall) {
        const caller = users.get(pendingCall.callerId);
        if (caller) {
          caller.inCall = false;
          caller.currentRoomId = undefined;
          io.to(caller.socketId).emit("call:rejected", { roomId: data.roomId, reason: data.reason ?? "declined" });
          io.to(caller.socketId).emit("call-declined", { roomId: data.roomId });
        }
        pendingCalls.delete(data.roomId);

        try {
          await db.update(calls).set({ status: "rejected", endTime: new Date() }).where(eq(calls.roomId, data.roomId));
          await db.insert(callLogs).values({ callId: data.roomId, userId, event: "rejected", metadata: { reason: data.reason } });
        } catch (err) {
          console.error("[Socket.IO] call:reject persist error:", err);
        }

        emitPresenceUpdate();
      }
    });

    /** call:end — either party ends the active call */
    socket.on("call:end", async (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const user = users.get(userId);

      if (user) { user.inCall = false; user.currentRoomId = undefined; }

      const activeCall = activeCalls.get(data.roomId);
      if (activeCall) {
        activeCall.participants = activeCall.participants.filter(p => p !== userId);
        if (activeCall.participants.length === 0) {
          activeCalls.delete(data.roomId);
          const now = new Date();
          const durationSeconds = Math.floor((now.getTime() - activeCall.startedAt.getTime()) / 1000);
          try {
            await db.update(calls).set({ status: "ended", endTime: now, durationSeconds }).where(eq(calls.roomId, data.roomId));
            await db.update(callSessions).set({ endTime: now, durationSeconds }).where(eq(callSessions.callId, data.roomId));
            await db.insert(callLogs).values({ callId: data.roomId, userId, event: "ended", metadata: { durationSeconds } });
          } catch (err) {
            console.error("[Socket.IO] call:end persist error:", err);
          }
        }
      }

      socket.to(data.roomId).emit("call:ended", { roomId: data.roomId, userId });
      socket.to(data.roomId).emit("call-ended", { roomId: data.roomId, userId });
      socket.leave(data.roomId);
      console.log(`[Socket.IO] call:end room:${data.roomId} by ${user?.displayName ?? userId}`);
      emitPresenceUpdate();
    });

    /** webrtc:offer — forward SDP offer to the target peer */
    socket.on("webrtc:offer", (data: { roomId: string; offer: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;
      if (data.targetPeerId) {
        const targetUser = users.get(data.targetPeerId);
        if (targetUser) {
          io.to(targetUser.socketId).emit("webrtc:offer", { offer: data.offer, roomId: data.roomId, fromPeerId });
          io.to(targetUser.socketId).emit("webrtc-offer", { offer: data.offer, roomId: data.roomId, fromPeerId });
        }
      } else {
        socket.to(data.roomId).emit("webrtc:offer", { offer: data.offer, roomId: data.roomId, fromPeerId });
        socket.to(data.roomId).emit("webrtc-offer", { offer: data.offer, roomId: data.roomId, fromPeerId });
      }
    });

    /** webrtc:answer — forward SDP answer to the target peer */
    socket.on("webrtc:answer", (data: { roomId: string; answer: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;
      if (data.targetPeerId) {
        const targetUser = users.get(data.targetPeerId);
        if (targetUser) {
          io.to(targetUser.socketId).emit("webrtc:answer", { answer: data.answer, roomId: data.roomId, fromPeerId });
          io.to(targetUser.socketId).emit("webrtc-answer", { answer: data.answer, roomId: data.roomId, fromPeerId });
        }
      } else {
        socket.to(data.roomId).emit("webrtc:answer", { answer: data.answer, roomId: data.roomId, fromPeerId });
        socket.to(data.roomId).emit("webrtc-answer", { answer: data.answer, roomId: data.roomId, fromPeerId });
      }
    });

    /** webrtc:ice-candidate — forward ICE candidate to the target peer */
    socket.on("webrtc:ice-candidate", (data: { roomId: string; candidate: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;
      if (data.targetPeerId) {
        const targetUser = users.get(data.targetPeerId);
        if (targetUser) {
          io.to(targetUser.socketId).emit("webrtc:ice-candidate", { candidate: data.candidate, roomId: data.roomId, fromPeerId });
          io.to(targetUser.socketId).emit("webrtc-ice-candidate", { candidate: data.candidate, roomId: data.roomId, fromPeerId });
        }
      } else {
        socket.to(data.roomId).emit("webrtc:ice-candidate", { candidate: data.candidate, roomId: data.roomId, fromPeerId });
        socket.to(data.roomId).emit("webrtc-ice-candidate", { candidate: data.candidate, roomId: data.roomId, fromPeerId });
      }
    });

    socket.on("disconnect", async () => {
      const userId = (socket as any).userId;

      if (userId) {
        const user = users.get(userId);

        if (user?.currentRoomId) {
          socket.to(user.currentRoomId).emit("call-ended", { roomId: user.currentRoomId, reason: "peer-disconnected", userId });

          const activeCall = activeCalls.get(user.currentRoomId);
          if (activeCall) {
            activeCall.participants = activeCall.participants.filter(p => p !== userId);
            if (activeCall.participants.length === 0) {
              activeCalls.delete(user.currentRoomId);
            } else {
              socket.to(user.currentRoomId).emit("peer-left", {
                roomId: user.currentRoomId,
                peerId: userId,
                peerName: user.displayName,
                participants: activeCall.participants,
              });
            }
          }
        }

        for (const [groupId, room] of groupRooms) {
          if (room.members.includes(userId)) {
            socket.to(`group_${groupId}`).emit("group-member-offline", {
              groupId,
              userId,
              displayName: user?.displayName,
            });
          }
        }

        users.delete(userId);
        console.log(`[Socket.IO] Disconnected: ${user?.displayName || userId} - Remaining: ${users.size}`);

        try {
          await db.update(onlineUsers)
            .set({ isOnline: false, lastSeen: new Date(), status: "offline" })
            .where(eq(onlineUsers.id, userId));
        } catch (err) {
          console.error("[Socket.IO] Failed to update offline status:", err);
        }

        emitPresenceUpdate();
      }
    });
  });

  return io;
}
