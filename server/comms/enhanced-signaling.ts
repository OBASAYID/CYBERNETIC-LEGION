/**
 * Enhanced Signaling Server v2.0
 * Advanced WebSocket signaling with international calling and cross-network support
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { v4 as uuid } from "uuid";
import { enhancedCommunicationEngine } from "./enhanced-communication-engine.js";

interface ConnectedUser {
  id: string;
  ws: WebSocket;
  name: string;
  status: "online" | "away" | "do_not_disturb" | "offline" | "in_call" | "international_call";
  networkInfo: {
    type: string;
    quality: number;
    country: string;
    international: boolean;
  };
  lastSeen: Date;
  rooms: Set<string>;
  capabilities: {
    video: boolean;
    audio: boolean;
    screenShare: boolean;
    international: boolean;
  };
}

interface SignalingMessage {
  type: string;
  from?: string;
  to?: string;
  room?: string;
  data?: any;
  timestamp: number;
  international?: boolean;
  networkInfo?: any;
}

interface Room {
  id: string;
  name: string;
  participants: Set<string>;
  type: "direct" | "group" | "conference" | "international";
  createdAt: Date;
  maxParticipants: number;
  isInternational: boolean;
  networkRequirements: {
    minQuality: number;
    preferredLatency: number;
  };
}

class EnhancedSignalingServer {
  private wss: WebSocketServer;
  private users: Map<string, ConnectedUser> = new Map();
  private rooms: Map<string, Room> = new Map();
  private pendingCalls: Map<string, any> = new Map();
  private internationalConnections: Map<string, any> = new Map();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.initializeServer();

    console.log(`[Enhanced Signaling] Server started on port ${port}`);
    console.log(`[Enhanced Signaling] International calling and cross-network signaling enabled`);
  }

  private initializeServer() {
    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      const userId = this.extractUserId(request);
      if (!userId) {
        ws.close(1008, "Invalid user ID");
        return;
      }

      this.handleConnection(ws, userId, request);
    });

    // Periodic cleanup
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 30000); // 30 seconds
  }

  private extractUserId(request: IncomingMessage): string | null {
    const url = new URL(request.url || "", "http://localhost");
    return url.searchParams.get("userId");
  }

  private async handleConnection(ws: WebSocket, userId: string, request: IncomingMessage) {
    try {
      // Get network info from connection
      const networkInfo = await this.detectNetworkInfo(request);

      const user: ConnectedUser = {
        id: userId,
        ws,
        name: `User-${userId.substring(0, 8)}`,
        status: "online",
        networkInfo,
        lastSeen: new Date(),
        rooms: new Set(),
        capabilities: {
          video: true,
          audio: true,
          screenShare: true,
          international: networkInfo.international
        }
      };

      this.users.set(userId, user);

      console.log(`[Enhanced Signaling] User ${userId} connected (${networkInfo.type}, ${networkInfo.country})`);

      // Setup message handling
      ws.on("message", (data: Buffer) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          this.handleMessage(userId, message);
        } catch (error) {
          console.error(`[Enhanced Signaling] Invalid message from ${userId}:`, error);
        }
      });

      ws.on("close", () => {
        this.handleDisconnection(userId);
      });

      ws.on("error", (error) => {
        console.error(`[Enhanced Signaling] Error for user ${userId}:`, error);
        this.handleDisconnection(userId);
      });

      // Send welcome message with capabilities
      this.sendToUser(userId, {
        type: "welcome",
        data: {
          userId,
          capabilities: user.capabilities,
          networkInfo,
          serverVersion: "2.0"
        },
        timestamp: Date.now()
      });

      // Broadcast presence
      this.broadcastPresence(userId, "online");

    } catch (error) {
      console.error(`[Enhanced Signaling] Connection setup failed for ${userId}:`, error);
      ws.close(1011, "Internal server error");
    }
  }

  private async detectNetworkInfo(request: IncomingMessage): Promise<ConnectedUser["networkInfo"]> {
    // In production, this would analyze headers, IP geolocation, etc.
    // For now, simulate based on connection properties
    const clientIP = request.socket.remoteAddress || "unknown";

    // Simulate international detection
    const isInternational = Math.random() > 0.7; // 30% international connections

    return {
      type: request.headers["x-network-type"] as string || "wifi",
      quality: parseInt(request.headers["x-network-quality"] as string) || 85,
      country: isInternational ? "UK" : "US", // Simulate country
      international: isInternational
    };
  }

  private handleMessage(userId: string, message: SignalingMessage) {
    const user = this.users.get(userId);
    if (!user) return;

    user.lastSeen = new Date();

    switch (message.type) {
      case "join_room":
        this.handleJoinRoom(userId, message);
        break;

      case "leave_room":
        this.handleLeaveRoom(userId, message);
        break;

      case "offer":
      case "answer":
      case "ice_candidate":
        this.handleWebRTCMessage(userId, message);
        break;

      case "call_request":
        this.handleCallRequest(userId, message);
        break;

      case "call_accept":
        this.handleCallAccept(userId, message);
        break;

      case "call_reject":
        this.handleCallReject(userId, message);
        break;

      case "international_call_request":
        this.handleInternationalCallRequest(userId, message);
        break;

      case "presence_update":
        this.handlePresenceUpdate(userId, message);
        break;

      case "ping":
        this.sendToUser(userId, {
          type: "pong",
          timestamp: Date.now()
        });
        break;

      default:
        console.log(`[Enhanced Signaling] Unknown message type: ${message.type} from ${userId}`);
    }
  }

  private handleJoinRoom(userId: string, message: SignalingMessage) {
    const { roomId, roomType = "direct", isInternational = false } = message.data;
    const user = this.users.get(userId);
    if (!user) return;

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      const room: Room = {
        id: roomId,
        name: `Room-${roomId.substring(0, 8)}`,
        participants: new Set(),
        type: roomType,
        createdAt: new Date(),
        maxParticipants: roomType === "conference" ? 50 : 10,
        isInternational,
        networkRequirements: {
          minQuality: isInternational ? 70 : 50,
          preferredLatency: isInternational ? 100 : 50
        }
      };
      this.rooms.set(roomId, room);
    }

    const room = this.rooms.get(roomId)!;

    // Check network compatibility
    if (isInternational && user.networkInfo.quality < room.networkRequirements.minQuality) {
      this.sendToUser(userId, {
        type: "room_join_error",
        data: {
          roomId,
          error: "Network quality too low for international room",
          requiredQuality: room.networkRequirements.minQuality,
          currentQuality: user.networkInfo.quality
        },
        timestamp: Date.now()
      });
      return;
    }

    // Add user to room
    room.participants.add(userId);
    user.rooms.add(roomId);

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: "user_joined",
      from: userId,
      data: {
        userId,
        userName: user.name,
        networkInfo: user.networkInfo,
        capabilities: user.capabilities
      },
      timestamp: Date.now()
    }, [userId]);

    // Send room info to user
    this.sendToUser(userId, {
      type: "room_joined",
      data: {
        roomId,
        room,
        participants: Array.from(room.participants).map(id => ({
          id,
          name: this.users.get(id)?.name || "Unknown",
          networkInfo: this.users.get(id)?.networkInfo
        }))
      },
      timestamp: Date.now()
    });

    console.log(`[Enhanced Signaling] User ${userId} joined room ${roomId} (${roomType})`);
  }

  private handleLeaveRoom(userId: string, message: SignalingMessage) {
    const { roomId } = message.data;
    const user = this.users.get(userId);
    if (!user) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId);
    user.rooms.delete(roomId);

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: "user_left",
      from: userId,
      data: { userId, userName: user.name },
      timestamp: Date.now()
    });

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }

    console.log(`[Enhanced Signaling] User ${userId} left room ${roomId}`);
  }

  private handleWebRTCMessage(userId: string, message: SignalingMessage) {
    const { to, room } = message;

    if (to) {
      // Direct message
      this.sendToUser(to, message);
    } else if (room) {
      // Room message
      this.broadcastToRoom(room, message, [userId]);
    }
  }

  private handleCallRequest(userId: string, message: SignalingMessage) {
    const { targetUserId, callType, international = false } = message.data;
    const caller = this.users.get(userId);
    const target = this.users.get(targetUserId);

    if (!caller || !target) {
      this.sendToUser(userId, {
        type: "call_error",
        data: { error: "User not found or offline" },
        timestamp: Date.now()
      });
      return;
    }

    const callId = uuid();
    this.pendingCalls.set(callId, {
      callId,
      caller: userId,
      target: targetUserId,
      callType,
      international,
      timestamp: Date.now()
    });

    // Send call request to target
    this.sendToUser(targetUserId, {
      type: "incoming_call",
      from: userId,
      data: {
        callId,
        caller: {
          id: userId,
          name: caller.name,
          networkInfo: caller.networkInfo
        },
        callType,
        international
      },
      timestamp: Date.now()
    });

    console.log(`[Enhanced Signaling] Call request from ${userId} to ${targetUserId} (${callType})`);
  }

  private handleInternationalCallRequest(userId: string, message: SignalingMessage) {
    const { targetUserId, callType, countryCode, routeId } = message.data;

    // Enhanced international call handling
    console.log(`[Enhanced Signaling] International call request from ${userId} to ${targetUserId} (${countryCode})`);

    // Check if international calling is supported
    const caller = this.users.get(userId);
    if (!caller?.capabilities.international) {
      this.sendToUser(userId, {
        type: "call_error",
        data: { error: "International calling not supported on current network" },
        timestamp: Date.now()
      });
      return;
    }

    // Proceed with international call setup
    this.handleCallRequest(userId, {
      ...message,
      data: {
        ...message.data,
        international: true
      }
    });
  }

  private handleCallAccept(userId: string, message: SignalingMessage) {
    const { callId } = message.data;
    const call = this.pendingCalls.get(callId);

    if (!call || call.target !== userId) {
      this.sendToUser(userId, {
        type: "call_error",
        data: { error: "Invalid call acceptance" },
        timestamp: Date.now()
      });
      return;
    }

    // Notify caller
    this.sendToUser(call.caller, {
      type: "call_accepted",
      from: userId,
      data: {
        callId,
        acceptor: {
          id: userId,
          name: this.users.get(userId)?.name || "Unknown",
          networkInfo: this.users.get(userId)?.networkInfo
        }
      },
      timestamp: Date.now()
    });

    // Update user statuses
    const caller = this.users.get(call.caller);
    const target = this.users.get(userId);

    if (caller) {
      caller.status = call.international ? "international_call" : "in_call";
    }
    if (target) {
      target.status = call.international ? "international_call" : "in_call";
    }

    this.pendingCalls.delete(callId);

    console.log(`[Enhanced Signaling] Call ${callId} accepted by ${userId}`);
  }

  private handleCallReject(userId: string, message: SignalingMessage) {
    const { callId } = message.data;
    const call = this.pendingCalls.get(callId);

    if (!call || call.target !== userId) return;

    // Notify caller
    this.sendToUser(call.caller, {
      type: "call_rejected",
      from: userId,
      data: { callId },
      timestamp: Date.now()
    });

    this.pendingCalls.delete(callId);

    console.log(`[Enhanced Signaling] Call ${callId} rejected by ${userId}`);
  }

  private handlePresenceUpdate(userId: string, message: SignalingMessage) {
    const { status, customMessage } = message.data;
    const user = this.users.get(userId);
    if (!user) return;

    user.status = status;
    user.lastSeen = new Date();

    this.broadcastPresence(userId, status, customMessage);
  }

  private handleDisconnection(userId: string) {
    const user = this.users.get(userId);
    if (!user) return;

    console.log(`[Enhanced Signaling] User ${userId} disconnected`);

    // Remove from all rooms
    for (const roomId of user.rooms) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.participants.delete(userId);
        this.broadcastToRoom(roomId, {
          type: "user_left",
          from: userId,
          data: { userId, userName: user.name },
          timestamp: Date.now()
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }

    // Clean up pending calls
    for (const [callId, call] of this.pendingCalls) {
      if (call.caller === userId || call.target === userId) {
        this.pendingCalls.delete(callId);
      }
    }

    // Broadcast offline status
    this.broadcastPresence(userId, "offline");

    this.users.delete(userId);
  }

  private sendToUser(userId: string, message: SignalingMessage) {
    const user = this.users.get(userId);
    if (user && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToRoom(roomId: string, message: SignalingMessage, excludeUsers: string[] = []) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const userId of room.participants) {
      if (!excludeUsers.includes(userId)) {
        this.sendToUser(userId, message);
      }
    }
  }

  private broadcastPresence(userId: string, status: string, customMessage?: string) {
    const user = this.users.get(userId);
    if (!user) return;

    const presenceMessage = {
      type: "presence_update",
      from: userId,
      data: {
        userId,
        name: user.name,
        status,
        customMessage,
        networkInfo: user.networkInfo,
        lastSeen: user.lastSeen,
        capabilities: user.capabilities
      },
      timestamp: Date.now()
    };

    // Broadcast to all connected users
    for (const [id, connectedUser] of this.users) {
      if (id !== userId && connectedUser.ws.readyState === WebSocket.OPEN) {
        connectedUser.ws.send(JSON.stringify(presenceMessage));
      }
    }
  }

  private cleanupInactiveUsers() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [userId, user] of this.users) {
      if (now - user.lastSeen.getTime() > timeout) {
        console.log(`[Enhanced Signaling] Cleaning up inactive user ${userId}`);
        this.handleDisconnection(userId);
      }
    }
  }

  // Public API methods
  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.users.values());
  }

  getActiveRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getUserCount(): number {
    return this.users.size;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  shutdown() {
    console.log("[Enhanced Signaling] Shutting down server...");

    // Close all connections
    for (const user of this.users.values()) {
      user.ws.close(1001, "Server shutdown");
    }

    this.wss.close(() => {
      console.log("[Enhanced Signaling] Server shutdown complete");
    });
  }
}

// Export singleton instance
export const enhancedSignalingServer = new EnhancedSignalingServer(8080);