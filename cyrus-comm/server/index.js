/**
 * CYRUS Comm — Express + Socket.IO signaling server.
 * Run: node index.js  (from server/)
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const fs = require("fs");
const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");

const config = require("../shared/config.js");
const { UserRegistry } = require("./services/userRegistry");
const { MessageStore } = require("./services/messageStore");
const { createSfuAdapter } = require("./services/sfuAdapter");
const { attachSignaling } = require("./signaling");
const { createRoutes } = require("./routes");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
  }),
);

const api = createRoutes(config);
app.use("/api", api);

/** Single-process demo: serve Vite build so one `node index.js` can host UI + API. */
if (process.env.CYRUS_COMM_SERVE_STATIC === "1") {
  const dist = path.join(__dirname, "..", "client", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
      res.sendFile(path.join(dist, "index.html"));
    });
    console.log("[cyrus-comm] serving static UI from", dist);
  } else {
    console.warn("[cyrus-comm] CYRUS_COMM_SERVE_STATIC=1 but client/dist missing — run: cd client && npm run build");
  }
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

const registry = new UserRegistry();
const messages = new MessageStore();
const sfu = createSfuAdapter(config);

attachSignaling(io, registry, messages);

server.listen(config.PORT, () => {
  console.log(`[cyrus-comm] API + Socket.IO on http://localhost:${config.PORT}`);
  console.log(`[cyrus-comm] CORS origins:`, config.CORS_ORIGINS.join(", "));
  console.log(`[cyrus-comm] SFU adapter: ${sfu.mode} (peer-to-peer; swap in services/sfuAdapter.js for mediasoup/Janus)`);
});

function shutdown() {
  console.log("[cyrus-comm] shutting down...");
  io.disconnectSockets(true);
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
