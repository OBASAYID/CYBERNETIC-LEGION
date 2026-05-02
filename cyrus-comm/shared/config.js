/**
 * CYRUS Comm — shared runtime configuration (STUN/TURN, ports, extension hooks).
 *
 * Satellite / Starlink: standard UDP/TCP to your signaling host + TURN; no proprietary API.
 * Expect higher RTT — prefer resilient Socket.IO (polling + websocket) and test TURN on constrained CPE NAT.
 *
 * UAV / MCN-1: reuse `location-update` / `location-updated`, or add a binary DataChannel in webrtc.js for telemetry.
 *
 * SFU scale-out: see server/services/sfuAdapter.js — swap P2P for mediasoup Worker or Janus handle.
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

/** Socket.IO / Express CORS origins (include API port when serving static SPA from same process). */
const CORS_ORIGINS = [
  CLIENT_ORIGIN,
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];

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
