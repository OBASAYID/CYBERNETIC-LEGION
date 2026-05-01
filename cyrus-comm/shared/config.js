/**
 * CYRUS Comm — shared runtime configuration (STUN/TURN, ports, extension hooks).
 * Starlink / satellite: no special API — ensure TURN is reachable over public IP;
 * clients use standard WebRTC; high latency may require longer ICE timeouts (tune in webrtc.js).
 * Future: UAV telemetry (MCN-1) can reuse location-update / dedicated data channels.
 */

const path = require("path");

const PORT = parseInt(process.env.CYRUS_COMM_PORT || "5050", 10);
const CLIENT_ORIGIN = process.env.CYRUS_COMM_CLIENT_ORIGIN || "http://localhost:5173";

/**
 * ICE servers for WebRTC. Add coturn credentials when deployed.
 * @see https://github.com/coturn/coturn
 */
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Example coturn (enable when ready):
  // {
  //   urls: ["turn:turn.yourdomain.com:3478", "turns:turn.yourdomain.com:5349"],
  //   username: process.env.TURN_USERNAME || "cyrus",
  //   credential: process.env.TURN_CREDENTIAL || "change-me",
  // },
];

/** Socket.IO CORS origins */
const CORS_ORIGINS = [CLIENT_ORIGIN, "http://127.0.0.1:5173", "http://localhost:3000"];

/** Future SFU (mediasoup / Janus) — signaling-only today; swap transport here when scaling */
const SFU = {
  mode: "p2p", // "p2p" | "mediasoup" | "janus"
  mediasoup: { workerCount: 0, rtcMinPort: 0, rtcMaxPort: 0 },
  janus: { wsUrl: "" },
};

/** Persistence adapter placeholder (PostgreSQL / MongoDB) */
const PERSISTENCE = {
  enabled: false,
  provider: "postgres", // or "mongodb"
  connectionString: process.env.DATABASE_URL || "",
};

module.exports = {
  PORT,
  CLIENT_ORIGIN,
  ICE_SERVERS,
  CORS_ORIGINS,
  SFU,
  PERSISTENCE,
  /** Resolve path from repo root */
  repoRoot: path.join(__dirname, ".."),
};
