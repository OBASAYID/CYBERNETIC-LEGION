/**
 * Socket.IO client with reconnection and connection recovery hints.
 */

import { io } from "socket.io-client";

/**
 * @returns {Promise<{ iceServers: RTCIceServer[] }>}
 */
export async function fetchWebRtcConfig() {
  const res = await fetch("/api/config/webrtc");
  if (!res.ok) throw new Error(`config fetch ${res.status}`);
  return res.json();
}

/**
 * Socket connects via Vite proxy (same origin in dev).
 */
export function createCyrusSocket() {
  const socket = io({
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 20000,
    autoConnect: false,
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connect_error", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnect", reason);
  });

  return socket;
}
