/**
 * CYRUS Comm — Express + Socket.IO signaling server.
 * Run: node index.js  (from server/)
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

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
  console.log(`[cyrus-comm] SFU mode: ${sfu.mode} (peer-to-peer)`);
});

function shutdown() {
  console.log("[cyrus-comm] shutting down...");
  io.disconnectSockets(true);
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
