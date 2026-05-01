# CYRUS Comm

**Integrated into the main CYRUS stack:** the fused app mounts the same signaling at **`/cyrus-comm-io`** and REST **`/api/cyrus-comm/config/webrtc`**. Use **Comms → P2P+** in the Command Center, or run this folder standalone for isolated demos.

Production-oriented **real-time communications** stack for CYRUS AI: **WebRTC** (voice/video), **Socket.IO** signaling, **live chat**, and **GPS-style location sharing**. Structured for later **TURN/coturn**, **SFU (mediasoup/Janus)**, **DB persistence**, and **satellite / Starlink** deployments (standard IP + WebRTC; add TURN for constrained NATs).

## Layout

```
cyrus-comm/
  shared/config.js       # STUN/TURN templates, ports, SFU/persistence stubs
  server/
    index.js             # Express + Socket.IO entry (node index.js)
    signaling.js         # join, call, ICE, messages, location
    routes/              # REST (/api/health, /api/config/webrtc)
    services/            # user registry, message store (swap for DB)
  client/
    src/App.js           # re-exports App.jsx
    src/App.jsx          # main UI + call orchestration
    src/webrtc.js        # RTCPeerConnection, getUserMedia, ICE restart
    src/socket.js        # Socket.IO client + ICE config fetch
    src/components/      # Login, users, chat, video, location
```

## Monorepo note

If this folder lives inside a parent repo with `"type": "module"`, **`cyrus-comm/package.json`** sets `"type": "commonjs"` so `shared/config.js` and the server load correctly under `require()`. The **client** keeps its own `"type": "module"` for Vite.

## Prerequisites

- Node.js **18+**
- Two browsers (or profiles) for call testing
- **Camera/microphone** permission when testing AV

## Setup

### 1. Server

```bash
cd cyrus-comm/server
npm install
cp .env.example .env   # optional
node index.js
```

Default API / Socket.IO: **http://localhost:5050**

### 2. Client

```bash
cd cyrus-comm/client
npm install
npm start
```

Vite dev server: **http://localhost:5173** (proxies `/api` and `/socket.io` to port 5050).

## Test with two clients

1. Start **server** then **client**.
2. Browser A: User ID `alice`, click **Join**.
3. Browser B: User ID `bob`, click **Join** — both should appear under **Online users**.
4. **Chat:** select peer, send messages (timestamped; history stored in-memory on server).
5. **Call:** click **Voice** or **Video** on a peer; accept media permissions on both sides.
6. **Location:** **Start sharing** on one client; the other sees updates in **Live location (debug)**.

## WebRTC / network

- **STUN:** `stun:stun.l.google.com:19302` (see `shared/config.js`).
- **TURN:** uncomment the coturn block in `shared/config.js` and set `TURN_USERNAME` / `TURN_CREDENTIAL` (or use time-limited credentials in production).
- **Symmetrical NAT / strict firewalls** usually require working **TURN**.

## Socket events (reference)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join` | C→S | Register `userId` / `displayName` |
| `call-user` | C→S | SDP offer + `callId` to callee |
| `incoming-call` | S→C | Offer to callee |
| `answer-call` | C→S | SDP answer |
| `call-answered` | S→C | Answer to caller |
| `ice-candidate` | C↔S | Trickle ICE |
| `end-call` | C→S | Hangup |
| `send-message` | C→S | DM to peer |
| `receive-message` | S→C | Incoming DM |
| `fetch-messages` | C→S (ack) | Load in-memory history |
| `location-update` | C→S | GPS payload |
| `location-updated` | S→C | Other users’ positions |

## Production notes

- Serve the client build behind HTTPS; WebRTC requires a **secure context** (localhost is exempt).
- Put **coturn** on a public IP; restrict realms and use **TLS** for `turns:`.
- Replace `MessageStore` with PostgreSQL/MongoDB; keep the same REST/WebSocket contract.
- For many participants per room, introduce an **SFU** (`services/sfuAdapter.js` stub) instead of full mesh.

## UAV / MCN-1 (future)

Reuse `location-update` or add a dedicated binary/DataChannel path; no change required to the base signaling server for a first integration.
