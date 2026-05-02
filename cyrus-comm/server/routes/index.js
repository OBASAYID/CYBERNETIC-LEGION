/**
 * REST API — health, config surface for clients, future persistence webhooks.
 */

const express = require("express");

/**
 * @param {ReturnType<typeof import('../../shared/config')>} config
 */
function createRoutes(config) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "cyrus-comm",
      ts: new Date().toISOString(),
    });
  });

  /** Public ICE server list (no secrets — TURN creds should be short-lived via separate token endpoint in production) */
  router.get("/config/webrtc", (_req, res) => {
    res.json({
      iceServers: config.ICE_SERVERS,
      sfu: config.SFU,
    });
  });

  /** Future: POST /messages persist webhook */
  router.get("/ready", (_req, res) => {
    res.json({ ready: true });
  });

  /** Contract summary for integrators (main CYRUS stack, gateways, mobile). */
  router.get("/extensions", (_req, res) => {
    res.json({
      signaling: {
        transport: "socket.io",
        path: "/socket.io",
        events: [
          "join",
          "leave",
          "join-session",
          "leave-session",
          "session-members",
          "call-user",
          "incoming-call",
          "answer-call",
          "call-answered",
          "ice-candidate",
          "end-call",
          "send-message",
          "receive-message",
          "fetch-messages",
          "location-update",
          "location-updated",
          "users-updated",
          "user-left",
        ],
      },
      webrtc: { iceServers: config.ICE_SERVERS, sfu: config.SFU },
      persistence: config.PERSISTENCE,
    });
  });

  return router;
}

module.exports = { createRoutes };
