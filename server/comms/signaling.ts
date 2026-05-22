import WebSocket, { WebSocketServer } from "ws";
import { v4 as uuid } from "uuid";
import { Server } from "http";

interface SignalMessage {
  type: string;
  roomId?: string;
  /** Direct P2P routing for `webrtc-service` (offer/answer/ICE, calls, chat). */
  to?: string;
  payload?: any;
  /** Client `webrtc-service` sends `data` for register/ping payloads. */
  data?: any;
  sender?: string;
  target?: string;
  targetUserId?: string;
}

interface ConnectedUser {
  id: string;
  displayName: string;
  ws: WebSocket;
  deviceId: string;
  lastActivity: Date;
  inCall: boolean;
  currentRoomId?: string;
}

const connectedUsers = new Map<string, ConnectedUser>();
const roomMap = new Map<string, Set<WebSocket>>();
const pendingCalls = new Map<string, {
  callerId: string;
  callerName: string;
  roomId: string;
  callType: string;
  timestamp: Date;
}>();

export function getConnectedUsers(): ConnectedUser[] {
  return Array.from(connectedUsers.values()).map(user => ({
    ...user,
    ws: undefined as any,
  }));
}

export function getUserSocket(userId: string): WebSocket | undefined {
  return connectedUsers.get(userId)?.ws;
}

export function broadcastToAll(message: any, excludeUserId?: string): void {
  const msgStr = JSON.stringify(message);
  connectedUsers.forEach((user, id) => {
    if (id !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(msgStr);
    }
  });
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function initSignalingServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  function joinRoom(roomId: string, ws: WebSocket) {
    if (!roomMap.has(roomId)) roomMap.set(roomId, new Set());
    roomMap.get(roomId)!.add(ws);
  }

  function leaveRoom(roomId: string, ws: WebSocket) {
    const room = roomMap.get(roomId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        roomMap.delete(roomId);
      }
    }
  }

  function broadcastPresence() {
    const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
      id: user.id,
      displayName: user.displayName,
      deviceId: user.deviceId,
      inCall: user.inCall,
      lastActivity: user.lastActivity,
    }));
    
    const message = JSON.stringify({
      type: "presence-update",
      users: onlineUsers,
    });

    connectedUsers.forEach((user) => {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(message);
      }
    });
  }

  /** Forward JSON body to a connected user by id (CYRUS comms / WebRTC P2P). */
  function forwardToPeer(targetUserId: string | undefined, body: Record<string, unknown>, label: string) {
    if (!targetUserId || typeof targetUserId !== "string") {
      console.warn(`[Signaling] ${label}: missing or invalid "to" user id`);
      return;
    }
    const target = connectedUsers.get(targetUserId);
    if (target?.ws.readyState === WebSocket.OPEN) {
      target.ws.send(JSON.stringify(body));
    } else {
      console.warn(`[Signaling] ${label}: peer offline (${targetUserId})`);
    }
  }

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);

    const wsTokenRequired = String(process.env.CYRUS_COMM_WS_TOKEN || "").trim();
    if (wsTokenRequired) {
      const offered = String(url.searchParams.get("token") || "").trim();
      if (offered !== wsTokenRequired) {
        try {
          ws.close(1008, "Signaling token required or invalid");
        } catch {
          /* ignore */
        }
        return;
      }
    }

    if (url.searchParams.get("probe") === "1") {
      try {
        ws.send(JSON.stringify({ type: "probe-ack", ts: Date.now() }));
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          ws.close(1000, "probe complete");
        } catch {
          /* ignore */
        }
      }, 50);
      return;
    }

    const roomId = url.searchParams.get("room");
    const userId = url.searchParams.get("userId") || `user_${uuid().substring(0, 8)}`;
    const displayNameRaw = url.searchParams.get("name") || `User-${userId.substring(0, 6)}`;
    const displayName = safeDecodeURIComponent(displayNameRaw);
    const deviceId = url.searchParams.get("deviceId") || uuid();

    const clientId = uuid();
    (ws as any).clientId = clientId;
    (ws as any).userId = userId;

    const prior = connectedUsers.get(userId);
    connectedUsers.set(userId, {
      id: userId,
      displayName,
      ws,
      deviceId,
      lastActivity: new Date(),
      inCall: false,
    });

    if (prior && prior.ws !== ws) {
      try {
        prior.ws.close(1000, "Superseded by new connection");
      } catch {
        /* ignore */
      }
    }

    console.log(`[Presence] User connected: ${displayName} (${userId}) - Total users: ${connectedUsers.size}`);
    console.log(`[Presence] All connected users: ${Array.from(connectedUsers.values()).map(u => u.displayName).join(", ")}`);

    if (roomId) {
      joinRoom(roomId, ws);
    }

    ws.send(JSON.stringify({
      type: "connected",
      userId,
      clientId,
      totalOnline: connectedUsers.size,
    }));

    broadcastPresence();

    ws.on("message", (data) => {
      try {
        const msg: SignalMessage = JSON.parse(data.toString());
        
        const user = connectedUsers.get(userId);
        if (user) {
          user.lastActivity = new Date();
        }

        switch (msg.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong", data: msg.data ?? {} }));
            break;

          case "register": {
            const d = msg.data ?? msg.payload;
            if (user && d) {
              if (typeof d.userName === "string" && d.userName.trim()) {
                user.displayName = d.userName.trim();
              } else if (typeof d.displayName === "string" && d.displayName.trim()) {
                user.displayName = d.displayName.trim();
              }
              broadcastPresence();
            }
            break;
          }

          // ── Direct peer relay (cyrus-ui `webrtc-service` — no roomId) ─────────
          case "call-request":
            forwardToPeer(
              msg.to,
              { type: "call-request", from: userId, data: msg.data ?? {} },
              "call-request",
            );
            break;

          case "call-response":
            forwardToPeer(
              msg.to,
              { type: "call-response", from: userId, data: msg.data ?? {} },
              "call-response",
            );
            break;

          case "call-end":
            forwardToPeer(
              msg.to,
              { type: "call-end", from: userId, data: msg.data ?? {} },
              "call-end",
            );
            break;

          case "text-message":
            forwardToPeer(
              msg.to,
              {
                type: "text-message",
                from: userId,
                to: msg.to,
                data: msg.data ?? {},
              },
              "text-message",
            );
            break;

          case "ice-restart-needed":
            forwardToPeer(msg.to, { type: "ice-restart-needed", from: userId }, "ice-restart-needed");
            break;

          case "group-invite":
            forwardToPeer(
              msg.to,
              { type: "group-invite", from: userId, data: msg.data ?? {} },
              "group-invite",
            );
            break;

          case "group-offer":
          case "group-answer":
          case "group-ice-candidate": {
            const tgt = msg.targetUserId;
            if (typeof tgt === "string") {
              forwardToPeer(
                tgt,
                {
                  type: msg.type,
                  roomId: msg.roomId,
                  targetUserId: msg.targetUserId,
                  from: userId,
                  data: msg.data,
                },
                msg.type,
              );
            }
            break;
          }

          case "group-reject":
            forwardToPeer(
              msg.to,
              { type: "group-reject", from: userId, roomId: msg.roomId, data: msg.data ?? {} },
              "group-reject",
            );
            break;

          case "group-end":
            if (msg.roomId) {
              const peers = roomMap.get(msg.roomId) || new Set();
              peers.forEach((peer) => {
                if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                  peer.send(JSON.stringify({ type: "group-end", roomId: msg.roomId, from: userId }));
                }
              });
            }
            break;

          case "call-user":
            console.log(`[Signaling] Call request from ${user?.displayName} to ${msg.targetUserId}`);
            console.log(`[Signaling] Connected users: ${Array.from(connectedUsers.keys()).join(", ")}`);
            const targetUser = connectedUsers.get(msg.targetUserId!);
            if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
              console.log(`[Signaling] Target user found: ${targetUser.displayName}`);
              const callRoomId = msg.roomId || `call_${uuid()}`;
              
              pendingCalls.set(callRoomId, {
                callerId: userId,
                callerName: user?.displayName || userId,
                roomId: callRoomId,
                callType: msg.payload?.callType || "video",
                timestamp: new Date(),
              });

              targetUser.ws.send(JSON.stringify({
                type: "incoming-call",
                callerId: userId,
                callerName: user?.displayName || userId,
                roomId: callRoomId,
                callType: msg.payload?.callType || "video",
              }));

              ws.send(JSON.stringify({
                type: "call-initiated",
                roomId: callRoomId,
                targetUserId: msg.targetUserId,
                status: "ringing",
              }));

              if (user) {
                user.inCall = true;
                user.currentRoomId = callRoomId;
              }
              broadcastPresence();
            } else {
              console.log(`[Signaling] Target user ${msg.targetUserId} NOT found or offline`);
              ws.send(JSON.stringify({
                type: "call-failed",
                reason: "user-offline",
                targetUserId: msg.targetUserId,
              }));
            }
            break;

          case "accept-call":
            const pendingCall = pendingCalls.get(msg.roomId!);
            if (pendingCall) {
              const caller = connectedUsers.get(pendingCall.callerId);
              if (caller && caller.ws.readyState === WebSocket.OPEN) {
                caller.ws.send(JSON.stringify({
                  type: "call-accepted",
                  roomId: msg.roomId,
                  acceptedBy: userId,
                  acceptedByName: user?.displayName,
                }));
              }

              joinRoom(msg.roomId!, ws);
              if (caller) {
                joinRoom(msg.roomId!, caller.ws);
              }

              if (user) {
                user.inCall = true;
                user.currentRoomId = msg.roomId;
              }
              broadcastPresence();
            }
            break;

          case "decline-call":
            const declinedCall = pendingCalls.get(msg.roomId!);
            if (declinedCall) {
              const caller = connectedUsers.get(declinedCall.callerId);
              if (caller && caller.ws.readyState === WebSocket.OPEN) {
                caller.ws.send(JSON.stringify({
                  type: "call-declined",
                  roomId: msg.roomId,
                  declinedBy: userId,
                  reason: msg.payload?.reason || "declined",
                }));
                caller.inCall = false;
                caller.currentRoomId = undefined;
              }
              pendingCalls.delete(msg.roomId!);
              broadcastPresence();
            }
            break;

          case "end-call":
            if (msg.roomId) {
              const room = roomMap.get(msg.roomId);
              if (room) {
                room.forEach((peer) => {
                  if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                    peer.send(JSON.stringify({
                      type: "call-ended",
                      roomId: msg.roomId,
                      endedBy: userId,
                    }));
                  }
                  const peerUserId = (peer as any).userId;
                  const peerUser = connectedUsers.get(peerUserId);
                  if (peerUser) {
                    peerUser.inCall = false;
                    peerUser.currentRoomId = undefined;
                  }
                });
                leaveRoom(msg.roomId, ws);
              }
              if (user) {
                user.inCall = false;
                user.currentRoomId = undefined;
              }
              pendingCalls.delete(msg.roomId);
              broadcastPresence();
            }
            break;

          case "join":
            if (msg.roomId) {
              joinRoom(msg.roomId, ws);
              const room = roomMap.get(msg.roomId);
              if (room) {
                room.forEach((peer) => {
                  if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                    peer.send(JSON.stringify({
                      type: "peer-joined",
                      peerId: clientId,
                      userId,
                      displayName: user?.displayName,
                    }));
                  }
                });
              }
            }
            break;

          case "offer":
          case "answer":
          case "ice-candidate":
          case "ice-restart":
            if (msg.roomId) {
              const peers = roomMap.get(msg.roomId) || new Set();
              peers.forEach((peer) => {
                if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                  peer.send(JSON.stringify({
                    ...msg,
                    sender: clientId,
                    senderUserId: userId,
                  }));
                }
              });
            } else if (msg.to) {
              forwardToPeer(
                msg.to,
                { type: msg.type, from: userId, data: msg.data },
                msg.type,
              );
            }
            break;

          case "heartbeat":
            if (user) {
              user.lastActivity = new Date();
            }
            ws.send(JSON.stringify({ type: "heartbeat-ack" }));
            break;

          default:
            if (msg.roomId) {
              const peers = roomMap.get(msg.roomId) || new Set();
              peers.forEach((peer) => {
                if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                  peer.send(JSON.stringify({ ...msg, sender: clientId }));
                }
              });
            }
        }
      } catch (err) {
        console.error("[signaling] Invalid message", err);
      }
    });

    ws.on("close", () => {
      for (const [roomId, set] of roomMap.entries()) {
        set.delete(ws);
        if (set.size === 0) {
          roomMap.delete(roomId);
        }
      }

      const user = connectedUsers.get(userId);
      if (user?.ws !== ws) {
        return;
      }

      if (user?.currentRoomId) {
        const room = roomMap.get(user.currentRoomId);
        if (room) {
          room.forEach((peer) => {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: "peer-disconnected",
                userId,
                displayName: user.displayName,
              }));
            }
          });
        }
      }

      console.log(`[Presence] User disconnected: ${user?.displayName || userId} - Remaining users: ${connectedUsers.size - 1}`);
      connectedUsers.delete(userId);

      broadcastPresence();
    });

    ws.on("error", (error) => {
      console.error("[signaling] WebSocket error:", error);
    });
  });

  setInterval(() => {
    const now = Date.now();
    connectedUsers.forEach((user, id) => {
      if (now - user.lastActivity.getTime() > 60000) {
        if (user.ws.readyState === WebSocket.OPEN) {
          user.ws.ping();
        }
      }
    });
  }, 30000);

  console.log("[signaling] WebSocket signaling active at /ws");
  return { getConnectedUsers, getUserSocket, broadcastToAll };
}
