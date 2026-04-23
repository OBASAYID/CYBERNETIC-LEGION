/**
 * Enhanced Socket.IO Signaling Server v2.0
 * Advanced Socket.IO signaling with international calling and cross-network support
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { v4 as uuid } from "uuid";
import { enhancedCommunicationEngine } from "./enhanced-communication-engine.js";

interface EnhancedUser {
  id: string;
  socket: Socket;
  name: string;
  status: "online" | "away" | "do_not_disturb" | "offline" | "in_call" | "international_call";
  networkInfo: {
    type: string;
    quality: number;
    latency: number;
    bandwidth: number;
    country: string;
    carrier?: string;
    roaming: boolean;
    international: boolean;
  };
  lastSeen: Date;
  rooms: Set<string>;
  capabilities: {
    video: boolean;
    audio: boolean;
    screenShare: boolean;
    international: boolean;
    encryption: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    quality: "low" | "medium" | "high" | "auto";
  };
}

interface EnhancedGroupRoom {
  id: string;
  name: string;
  participants: Set<string>;
  type: "direct" | "group" | "conference" | "international_conference";
  createdAt: Date;
  maxParticipants: number;
  isInternational: boolean;
  language: string;
  networkRequirements: {
    minQuality: number;
    maxLatency: number;
    minBandwidth: number;
  };
  encryptionEnabled: boolean;
  recordingEnabled: boolean;
  creator: string;
}

interface PendingCall {
  id: string;
  caller: string;
  callee: string;
  callType: "voice" | "video" | "conference" | "international_voice" | "international_video";
  status: "ringing" | "accepted" | "rejected" | "missed" | "cancelled";
  timestamp: Date;
  roomId?: string;
  international: boolean;
  routeId?: string;
  qualitySettings: {
    videoQuality: string;
    audioCodec: string;
    encryptionLevel: string;
  };
}

class EnhancedSocketSignalingServer {
  private io: SocketIOServer;
  private users: Map<string, EnhancedUser> = new Map();
  private rooms: Map<string, EnhancedGroupRoom> = new Map();
  private pendingCalls: Map<string, PendingCall> = new Map();
  private activeCalls: Map<string, any> = new Map();
  private messageHistory: Map<string, any[]> = new Map();

  constructor(server: HTTPServer, corsOrigins: string[] = ["*"]) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ["websocket", "polling"]
    });

    this.initializeServer();

    console.log(`[Enhanced Socket.IO] Server initialized with CORS origins: ${corsOrigins.join(", ")}`);
    console.log(`[Enhanced Socket.IO] International calling and advanced networking enabled`);
  }

  private initializeServer() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[Enhanced Socket.IO] New connection: ${socket.id}`);

      socket.on("register", (data) => this.handleRegister(socket, data));
      socket.on("disconnect", () => this.handleDisconnect(socket));
      socket.on("ping", () => this.handlePing(socket));

      // Enhanced messaging events
      socket.on("send_message", (data) => this.handleSendMessage(socket, data));
      socket.on("send_group_message", (data) => this.handleSendGroupMessage(socket, data));
      socket.on("send_international_message", (data) => this.handleSendInternationalMessage(socket, data));

      // Enhanced call events
      socket.on("initiate_call", (data) => this.handleInitiateCall(socket, data));
      socket.on("initiate_international_call", (data) => this.handleInitiateInternationalCall(socket, data));
      socket.on("accept_call", (data) => this.handleAcceptCall(socket, data));
      socket.on("reject_call", (data) => this.handleRejectCall(socket, data));
      socket.on("end_call", (data) => this.handleEndCall(socket, data));

      // WebRTC signaling events
      socket.on("offer", (data) => this.handleWebRTCOffer(socket, data));
      socket.on("answer", (data) => this.handleWebRTCAnswer(socket, data));
      socket.on("ice_candidate", (data) => this.handleICECandidate(socket, data));

      // Room management events
      socket.on("join_room", (data) => this.handleJoinRoom(socket, data));
      socket.on("leave_room", (data) => this.handleLeaveRoom(socket, data));
      socket.on("create_group", (data) => this.handleCreateGroup(socket, data));

      // Presence and status events
      socket.on("update_presence", (data) => this.handleUpdatePresence(socket, data));
      socket.on("get_online_users", () => this.handleGetOnlineUsers(socket));

      // File sharing events
      socket.on("send_file", (data) => this.handleSendFile(socket, data));

      // Screen sharing events
      socket.on("start_screen_share", (data) => this.handleStartScreenShare(socket, data));
      socket.on("stop_screen_share", (data) => this.handleStopScreenShare(socket, data));

      // Quality optimization events
      socket.on("request_quality_optimization", (data) => this.handleQualityOptimization(socket, data));
    });

    // Periodic cleanup
    setInterval(() => {
      this.cleanupInactiveUsers();
      this.cleanupEmptyRooms();
    }, 60000); // 1 minute
  }

  private async handleRegister(socket: Socket, data: any) {
    try {
      const {
        userId,
        userName,
        networkInfo = {},
        capabilities = {},
        preferences = {}
      } = data;

      if (!userId) {
        socket.emit("registration_error", { error: "User ID required" });
        return;
      }

      // Enhanced network detection
      const detectedNetworkInfo = await this.detectNetworkInfo(socket, networkInfo);

      const user: EnhancedUser = {
        id: userId,
        socket,
        name: userName || `User-${userId.substring(0, 8)}`,
        status: "online",
        networkInfo: detectedNetworkInfo,
        lastSeen: new Date(),
        rooms: new Set(),
        capabilities: {
          video: true,
          audio: true,
          screenShare: true,
          international: detectedNetworkInfo.international,
          encryption: true,
          ...capabilities
        },
        preferences: {
          language: "en",
          timezone: "UTC",
          quality: "auto",
          ...preferences
        }
      };

      this.users.set(userId, user);

      // Store socket mapping for reverse lookup
      (socket as any).userId = userId;

      socket.emit("registered", {
        userId,
        capabilities: user.capabilities,
        networkInfo: user.networkInfo,
        serverVersion: "2.0",
        features: [
          "international_calling",
          "network_agnostic_messaging",
          "quality_optimization",
          "enhanced_encryption",
          "multi_language_support"
        ]
      });

      this.broadcastPresenceUpdate(userId);

      console.log(`[Enhanced Socket.IO] User ${userId} registered (${detectedNetworkInfo.type}, ${detectedNetworkInfo.country})`);

    } catch (error) {
      console.error("[Enhanced Socket.IO] Registration failed:", error);
      socket.emit("registration_error", { error: "Registration failed" });
    }
  }

  private async detectNetworkInfo(socket: Socket, providedInfo: any = {}): Promise<EnhancedUser["networkInfo"]> {
    // Enhanced network detection using socket properties and provided info
    const clientIP = socket.handshake.address;
    const userAgent = socket.handshake.headers["user-agent"] || "";

    // Simulate international detection based on IP patterns
    const isInternational = this.isInternationalIP(clientIP);

    return {
      type: providedInfo.type || this.detectNetworkType(userAgent),
      quality: providedInfo.quality || 85,
      latency: providedInfo.latency || 25,
      bandwidth: providedInfo.bandwidth || 50000,
      country: providedInfo.country || (isInternational ? "UK" : "US"),
      carrier: providedInfo.carrier,
      roaming: providedInfo.roaming || false,
      international: isInternational
    };
  }

  private isInternationalIP(ip: string): boolean {
    // Simple simulation - in production, use IP geolocation service
    return Math.random() > 0.7; // 30% international
  }

  private detectNetworkType(userAgent: string): string {
    if (userAgent.includes("Mobile")) return "cellular";
    if (userAgent.includes("WiFi")) return "wifi";
    return "unknown";
  }

  private handleSendMessage(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { recipientId, content, messageType = "text", priority = "normal" } = data;

    if (!recipientId || !content) {
      socket.emit("message_error", { error: "Recipient and content required" });
      return;
    }

    const recipient = this.users.get(recipientId);
    if (!recipient) {
      socket.emit("message_error", { error: "Recipient not online" });
      return;
    }

    const message = {
      id: uuid(),
      from: userId,
      to: recipientId,
      content,
      messageType,
      priority,
      timestamp: new Date(),
      networkInfo: user.networkInfo,
      delivered: false,
      read: false
    };

    // Send to recipient
    recipient.socket.emit("new_message", message);

    // Confirm to sender
    socket.emit("message_sent", {
      messageId: message.id,
      recipientId,
      status: "sent"
    });

    // Store in history
    this.storeMessage(message);

    console.log(`[Enhanced Socket.IO] Message from ${userId} to ${recipientId} (${messageType})`);
  }

  private handleSendInternationalMessage(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { recipientId, content, messageType = "text", countryCode } = data;

    if (!user.capabilities.international) {
      socket.emit("message_error", { error: "International messaging not supported" });
      return;
    }

    // Enhanced international message handling
    console.log(`[Enhanced Socket.IO] International message from ${userId} to ${recipientId} (${countryCode})`);

    // Proceed with international message
    this.handleSendMessage(socket, {
      ...data,
      international: true
    });
  }

  private handleSendGroupMessage(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { roomId, content, messageType = "text" } = data;

    if (!roomId || !content) {
      socket.emit("message_error", { error: "Room ID and content required" });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room || !room.participants.has(userId)) {
      socket.emit("message_error", { error: "Not a member of this room" });
      return;
    }

    const message = {
      id: uuid(),
      from: userId,
      roomId,
      content,
      messageType,
      timestamp: new Date(),
      networkInfo: user.networkInfo,
      isGroupMessage: true
    };

    // Send to all room participants except sender
    for (const participantId of room.participants) {
      if (participantId !== userId) {
        const participant = this.users.get(participantId);
        if (participant) {
          participant.socket.emit("new_group_message", message);
        }
      }
    }

    // Confirm to sender
    socket.emit("group_message_sent", {
      messageId: message.id,
      roomId,
      status: "sent"
    });

    // Store in history
    this.storeMessage(message);

    console.log(`[Enhanced Socket.IO] Group message in ${roomId} from ${userId} (${messageType})`);
  }

  private handleInitiateCall(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { targetUserId, callType = "voice", qualitySettings = {} } = data;

    if (!targetUserId) {
      socket.emit("call_error", { error: "Target user required" });
      return;
    }

    const target = this.users.get(targetUserId);
    if (!target) {
      socket.emit("call_error", { error: "Target user not online" });
      return;
    }

    const callId = uuid();
    const call: PendingCall = {
      id: callId,
      caller: userId,
      callee: targetUserId,
      callType,
      status: "ringing",
      timestamp: new Date(),
      international: false,
      qualitySettings: {
        videoQuality: "720p",
        audioCodec: "OPUS",
        encryptionLevel: "AES256",
        ...qualitySettings
      }
    };

    this.pendingCalls.set(callId, call);

    // Send call request to target
    target.socket.emit("incoming_call", {
      callId,
      caller: {
        id: userId,
        name: user.name,
        networkInfo: user.networkInfo,
        capabilities: user.capabilities
      },
      callType,
      qualitySettings: call.qualitySettings
    });

    // Set timeout for call
    setTimeout(() => {
      if (this.pendingCalls.has(callId)) {
        this.pendingCalls.get(callId)!.status = "missed";
        socket.emit("call_missed", { callId });
        target.socket.emit("call_missed", { callId });
        this.pendingCalls.delete(callId);
      }
    }, 30000); // 30 second timeout

    console.log(`[Enhanced Socket.IO] Call initiated: ${callId} from ${userId} to ${targetUserId} (${callType})`);
  }

  private handleInitiateInternationalCall(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { targetUserId, callType = "international_voice", countryCode, routeId } = data;

    if (!user.capabilities.international) {
      socket.emit("call_error", { error: "International calling not supported" });
      return;
    }

    console.log(`[Enhanced Socket.IO] International call initiated from ${userId} to ${targetUserId} (${countryCode})`);

    // Enhanced international call setup
    this.handleInitiateCall(socket, {
      ...data,
      callType: callType.startsWith("international_") ? callType : `international_${callType}`,
      international: true,
      routeId
    });
  }

  private handleAcceptCall(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { callId } = data;

    const call = this.pendingCalls.get(callId);
    if (!call || call.callee !== userId) {
      socket.emit("call_error", { error: "Invalid call acceptance" });
      return;
    }

    call.status = "accepted";
    const caller = this.users.get(call.caller);
    const callee = this.users.get(userId);

    if (caller && callee) {
      // Update statuses
      caller.status = call.international ? "international_call" : "in_call";
      callee.status = call.international ? "international_call" : "in_call";

      // Create call room
      const roomId = uuid();
      const room: EnhancedGroupRoom = {
        id: roomId,
        name: `Call-${callId.substring(0, 8)}`,
        participants: new Set([call.caller, userId]),
        type: call.international ? "international_conference" : "conference",
        createdAt: new Date(),
        maxParticipants: 2,
        isInternational: call.international,
        language: "en",
        networkRequirements: {
          minQuality: call.international ? 70 : 50,
          maxLatency: call.international ? 150 : 100,
          minBandwidth: call.international ? 1000 : 500
        },
        encryptionEnabled: true,
        recordingEnabled: false,
        creator: call.caller
      };

      this.rooms.set(roomId, room);
      call.roomId = roomId;

      // Notify both parties
      caller.socket.emit("call_accepted", {
        callId,
        roomId,
        callee: {
          id: userId,
          name: callee.name,
          networkInfo: callee.networkInfo
        },
        qualitySettings: call.qualitySettings
      });

      socket.emit("call_started", {
        callId,
        roomId,
        caller: {
          id: call.caller,
          name: caller.name,
          networkInfo: caller.networkInfo
        },
        qualitySettings: call.qualitySettings
      });

      this.activeCalls.set(callId, call);
      this.pendingCalls.delete(callId);

      console.log(`[Enhanced Socket.IO] Call ${callId} accepted, room ${roomId} created`);
    }
  }

  private handleRejectCall(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { callId } = data;

    const call = this.pendingCalls.get(callId);
    if (!call || call.callee !== userId) return;

    call.status = "rejected";

    const caller = this.users.get(call.caller);
    if (caller) {
      caller.socket.emit("call_rejected", { callId });
    }

    socket.emit("call_rejected", { callId });
    this.pendingCalls.delete(callId);

    console.log(`[Enhanced Socket.IO] Call ${callId} rejected by ${userId}`);
  }

  private handleEndCall(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { callId } = data;

    const call = this.activeCalls.get(callId);
    if (!call) return;

    // Update user statuses
    const caller = this.users.get(call.caller);
    const callee = this.users.get(call.callee);

    if (caller) caller.status = "online";
    if (callee) callee.status = "online";

    // Clean up room
    if (call.roomId) {
      this.rooms.delete(call.roomId);
    }

    // Notify both parties
    if (caller) caller.socket.emit("call_ended", { callId });
    if (callee) callee.socket.emit("call_ended", { callId });

    this.activeCalls.delete(callId);

    console.log(`[Enhanced Socket.IO] Call ${callId} ended`);
  }

  private handleWebRTCOffer(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { callId, offer } = data;

    const call = this.activeCalls.get(callId);
    if (!call) return;

    const targetId = call.caller === userId ? call.callee : call.caller;
    const target = this.users.get(targetId);

    if (target) {
      target.socket.emit("webrtc_offer", { callId, offer, from: userId });
    }
  }

  private handleWebRTCAnswer(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { callId, answer } = data;

    const call = this.activeCalls.get(callId);
    if (!call) return;

    const targetId = call.caller === userId ? call.callee : call.caller;
    const target = this.users.get(targetId);

    if (target) {
      target.socket.emit("webrtc_answer", { callId, answer, from: userId });
    }
  }

  private handleICECandidate(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { callId, candidate } = data;

    const call = this.activeCalls.get(callId);
    if (!call) return;

    const targetId = call.caller === userId ? call.callee : call.caller;
    const target = this.users.get(targetId);

    if (target) {
      target.socket.emit("ice_candidate", { callId, candidate, from: userId });
    }
  }

  private handleJoinRoom(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { roomId } = data;

    if (!roomId) {
      socket.emit("room_error", { error: "Room ID required" });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit("room_error", { error: "Room not found" });
      return;
    }

    // Check network compatibility for international rooms
    if (room.isInternational && user.networkInfo.quality < room.networkRequirements.minQuality) {
      socket.emit("room_error", {
        error: "Network quality insufficient for international room",
        required: room.networkRequirements.minQuality,
        current: user.networkInfo.quality
      });
      return;
    }

    room.participants.add(userId);
    user.rooms.add(roomId);

    // Notify other participants
    for (const participantId of room.participants) {
      if (participantId !== userId) {
        const participant = this.users.get(participantId);
        if (participant) {
          participant.socket.emit("user_joined_room", {
            roomId,
            user: {
              id: userId,
              name: user.name,
              networkInfo: user.networkInfo
            }
          });
        }
      }
    }

    socket.emit("room_joined", {
      roomId,
      room: {
        ...room,
        participants: Array.from(room.participants)
      }
    });

    console.log(`[Enhanced Socket.IO] User ${userId} joined room ${roomId}`);
  }

  private handleLeaveRoom(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { roomId } = data;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId);
    user.rooms.delete(roomId);

    // Notify other participants
    for (const participantId of room.participants) {
      const participant = this.users.get(participantId);
      if (participant) {
        participant.socket.emit("user_left_room", {
          roomId,
          userId
        });
      }
    }

    socket.emit("room_left", { roomId });

    console.log(`[Enhanced Socket.IO] User ${userId} left room ${roomId}`);
  }

  private handleCreateGroup(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const {
      name,
      participants,
      isInternational = false,
      language = "en",
      encryptionEnabled = true
    } = data;

    if (!name || !participants || participants.length === 0) {
      socket.emit("group_error", { error: "Name and participants required" });
      return;
    }

    const roomId = uuid();
    const room: EnhancedGroupRoom = {
      id: roomId,
      name,
      participants: new Set([userId, ...participants]),
      type: isInternational ? "international_conference" : "group",
      createdAt: new Date(),
      maxParticipants: 50,
      isInternational,
      language,
      networkRequirements: {
        minQuality: isInternational ? 70 : 50,
        maxLatency: isInternational ? 150 : 100,
        minBandwidth: isInternational ? 1000 : 500
      },
      encryptionEnabled,
      recordingEnabled: false,
      creator: userId
    };

    this.rooms.set(roomId, room);

    // Add room to all participants
    for (const participantId of room.participants) {
      const participant = this.users.get(participantId);
      if (participant) {
        participant.rooms.add(roomId);
        participant.socket.emit("group_created", {
          roomId,
          group: {
            ...room,
            participants: Array.from(room.participants)
          }
        });
      }
    }

    console.log(`[Enhanced Socket.IO] Group ${name} created by ${userId} (${room.participants.size} members)`);
  }

  private handleUpdatePresence(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { status, customMessage } = data;

    user.status = status;
    user.lastSeen = new Date();

    this.broadcastPresenceUpdate(userId, customMessage);
  }

  private handleGetOnlineUsers(socket: Socket) {
    const onlineUsers = Array.from(this.users.values())
      .filter(user => user.status !== "offline")
      .map(user => ({
        id: user.id,
        name: user.name,
        status: user.status,
        networkInfo: user.networkInfo,
        capabilities: user.capabilities
      }));

    socket.emit("online_users", { users: onlineUsers });
  }

  private handleSendFile(socket: Socket, data: any) {
    // Enhanced file sharing with international support
    const userId = (socket as any).userId;
    const user = this.users.get(userId);
    if (!user) return;

    const { roomId, fileName, fileSize, fileType } = data;

    // Validate file
    if (fileSize > 50 * 1024 * 1024) { // 50MB limit
      socket.emit("file_error", { error: "File too large" });
      return;
    }

    // Broadcast file info to room
    const room = this.rooms.get(roomId);
    if (room) {
      for (const participantId of room.participants) {
        if (participantId !== userId) {
          const participant = this.users.get(participantId);
          if (participant) {
            participant.socket.emit("file_shared", {
              from: userId,
              roomId,
              fileName,
              fileSize,
              fileType,
              timestamp: new Date()
            });
          }
        }
      }
    }

    console.log(`[Enhanced Socket.IO] File ${fileName} shared by ${userId} in room ${roomId}`);
  }

  private handleStartScreenShare(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { roomId } = data;

    const room = this.rooms.get(roomId);
    if (!room || !room.participants.has(userId)) return;

    // Notify room participants
    for (const participantId of room.participants) {
      if (participantId !== userId) {
        const participant = this.users.get(participantId);
        if (participant) {
          participant.socket.emit("screen_share_started", {
            from: userId,
            roomId
          });
        }
      }
    }

    console.log(`[Enhanced Socket.IO] Screen share started by ${userId} in room ${roomId}`);
  }

  private handleStopScreenShare(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { roomId } = data;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Notify room participants
    for (const participantId of room.participants) {
      const participant = this.users.get(participantId);
      if (participant) {
        participant.socket.emit("screen_share_stopped", {
          from: userId,
          roomId
        });
      }
    }

    console.log(`[Enhanced Socket.IO] Screen share stopped by ${userId} in room ${roomId}`);
  }

  private handleQualityOptimization(socket: Socket, data: any) {
    const userId = (socket as any).userId;
    const { callId } = data;

    // Request quality optimization from communication engine
    enhancedCommunicationEngine.optimizeCallQuality(callId)
      .then(optimizations => {
        socket.emit("quality_optimized", {
          callId,
          optimizations
        });
      })
      .catch(error => {
        socket.emit("quality_error", {
          callId,
          error: error.message
        });
      });
  }

  private handlePing(socket: Socket) {
    socket.emit("pong", { timestamp: Date.now() });
  }

  private handleDisconnect(socket: Socket) {
    const userId = (socket as any).userId;
    if (!userId) return;

    const user = this.users.get(userId);
    if (!user) return;

    console.log(`[Enhanced Socket.IO] User ${userId} disconnected`);

    // Update status
    user.status = "offline";
    user.lastSeen = new Date();

    // Remove from rooms
    for (const roomId of user.rooms) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.participants.delete(userId);
        // Notify other participants
        for (const participantId of room.participants) {
          const participant = this.users.get(participantId);
          if (participant) {
            participant.socket.emit("user_left_room", {
              roomId,
              userId
            });
          }
        }
      }
    }

    // Clean up calls
    for (const [callId, call] of this.pendingCalls) {
      if (call.caller === userId || call.callee === userId) {
        this.pendingCalls.delete(callId);
      }
    }

    for (const [callId, call] of this.activeCalls) {
      if (call.caller === userId || call.callee === userId) {
        this.handleEndCall(socket, { callId });
      }
    }

    this.broadcastPresenceUpdate(userId);
    this.users.delete(userId);
  }

  private broadcastPresenceUpdate(userId: string, customMessage?: string) {
    const user = this.users.get(userId);
    if (!user) return;

    const presenceData = {
      userId,
      name: user.name,
      status: user.status,
      customMessage,
      networkInfo: user.networkInfo,
      capabilities: user.capabilities,
      lastSeen: user.lastSeen
    };

    this.io.emit("presence_update", presenceData);
  }

  private storeMessage(message: any) {
    const key = message.roomId || `${message.from}-${message.to}`;
    if (!this.messageHistory.has(key)) {
      this.messageHistory.set(key, []);
    }

    const history = this.messageHistory.get(key)!;
    history.push(message);

    // Keep only last 100 messages
    if (history.length > 100) {
      history.shift();
    }
  }

  private cleanupInactiveUsers() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [userId, user] of this.users) {
      if (now - user.lastSeen.getTime() > timeout) {
        console.log(`[Enhanced Socket.IO] Cleaning up inactive user ${userId}`);
        this.handleDisconnect(user.socket);
      }
    }
  }

  private cleanupEmptyRooms() {
    for (const [roomId, room] of this.rooms) {
      if (room.participants.size === 0) {
        console.log(`[Enhanced Socket.IO] Cleaning up empty room ${roomId}`);
        this.rooms.delete(roomId);
      }
    }
  }

  // Public API methods
  getConnectedUsers(): EnhancedUser[] {
    return Array.from(this.users.values());
  }

  getActiveRooms(): EnhancedGroupRoom[] {
    return Array.from(this.rooms.values());
  }

  getUserCount(): number {
    return this.users.size;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getActiveCallsCount(): number {
    return this.activeCalls.size;
  }

  shutdown() {
    console.log("[Enhanced Socket.IO] Shutting down server...");
    this.io.close(() => {
      console.log("[Enhanced Socket.IO] Server shutdown complete");
    });
  }
}

export { EnhancedSocketSignalingServer };