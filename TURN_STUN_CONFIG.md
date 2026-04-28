# STUN / TURN Server Configuration

## Overview

CYRUS uses WebRTC for peer-to-peer voice and video calls. WebRTC requires
**STUN** servers to discover public IP addresses and **TURN** servers to relay
media when a direct peer-to-peer connection cannot be established (e.g. behind
symmetric NAT, corporate firewalls, or carrier-grade NAT on mobile networks).

---

## Default Configuration

The following servers are configured out-of-the-box in
`cyrus-ui/src/hooks/useWebRTC.ts` and `cyrus-ui/src/lib/webrtc-service.ts`:

### STUN Servers (free, no credentials required)

| Server | Notes |
|--------|-------|
| `stun:stun.l.google.com:19302` | Google — primary |
| `stun:stun1.l.google.com:19302` | Google — fallback 1 |
| `stun:stun2.l.google.com:19302` | Google — fallback 2 |
| `stun:stun3.l.google.com:19302` | Google — fallback 3 |
| `stun:stun4.l.google.com:19302` | Google — fallback 4 |
| `stun:global.stun.twilio.com:3478` | Twilio |

STUN is sufficient for most home/office networks where both peers are behind
standard NAT (full-cone or port-restricted cone NAT).

### TURN Servers (open-relay — free tier)

| Server | Protocol | Username | Credential |
|--------|----------|----------|------------|
| `turn:openrelay.metered.ca:80` | UDP/TCP | `openrelayproject` | `openrelayproject` |
| `turn:openrelay.metered.ca:443` | UDP/TCP | `openrelayproject` | `openrelayproject` |
| `turn:openrelay.metered.ca:443?transport=tcp` | TCP | `openrelayproject` | `openrelayproject` |
| `turns:openrelay.metered.ca:443` | TLS | `openrelayproject` | `openrelayproject` |

> ⚠️ **The open-relay TURN server is a community resource.** It is suitable
> for development and low-traffic deployments. For production use, provision a
> dedicated TURN server (see below).

---

## Adding a Dedicated TURN Server

For reliable calls across restrictive networks (mobile data, corporate
firewalls, symmetric NAT), deploy your own TURN server or use a managed
service.

### Option 1 — Twilio Network Traversal Service (managed)

1. Create a Twilio account at <https://www.twilio.com>
2. Enable the **Network Traversal Service** in the console
3. Generate credentials via the Twilio API:

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Tokens.json \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

4. Add the returned ICE servers to `ICE_SERVERS` in
   `cyrus-ui/src/hooks/useWebRTC.ts`:

```typescript
{
  urls: "turn:global.turn.twilio.com:3478?transport=udp",
  username: "<twilio-username>",
  credential: "<twilio-credential>",
},
{
  urls: "turn:global.turn.twilio.com:3478?transport=tcp",
  username: "<twilio-username>",
  credential: "<twilio-credential>",
},
{
  urls: "turns:global.turn.twilio.com:443?transport=tcp",
  username: "<twilio-username>",
  credential: "<twilio-credential>",
},
```

### Option 2 — Self-hosted coturn

Install [coturn](https://github.com/coturn/coturn) on a VPS with a public IP:

```bash
# Ubuntu / Debian
sudo apt-get install coturn

# /etc/turnserver.conf (minimal)
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
realm=your-domain.com
user=cyrus:your-secret-password
cert=/etc/letsencrypt/live/your-domain.com/fullchain.pem
pkey=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

Then add to `ICE_SERVERS`:

```typescript
{
  urls: "turn:your-domain.com:3478",
  username: "cyrus",
  credential: "your-secret-password",
},
{
  urls: "turns:your-domain.com:5349",
  username: "cyrus",
  credential: "your-secret-password",
},
```

### Option 3 — Metered.ca (managed, free tier available)

1. Sign up at <https://www.metered.ca/tools/openrelay/>
2. Create a TURN server and copy the credentials
3. Replace the open-relay entries in `ICE_SERVERS` with your personal
   credentials to avoid rate limits

---

## Environment Variables (optional)

To avoid hard-coding TURN credentials, you can expose them via the backend
and fetch them dynamically. Add to your Railway environment:

```
TURN_SERVER_URL=turn:your-domain.com:3478
TURN_USERNAME=cyrus
TURN_CREDENTIAL=your-secret-password
```

Then create a `/api/comms/ice-servers` endpoint that returns the ICE server
list, and fetch it in `useWebRTC.ts` before creating the peer connection.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Call connects on same WiFi but not across networks | No TURN server | Add a TURN server |
| Call connects on WiFi but not on mobile data | Symmetric NAT on carrier | Use TURN with TCP/TLS |
| ICE gathering takes > 10 s | STUN unreachable | Check firewall; add more STUN servers |
| `RTCPeerConnection` state stuck at `checking` | Both peers behind symmetric NAT | TURN relay required |
| Audio works but no video | Video codec mismatch or bandwidth | Lower video resolution constraints |

---

## Network Quality Indicators

The `useWebRTC` hook monitors connection quality every 2 seconds using
`RTCPeerConnection.getStats()` and exposes a `connectionQuality` value:

| Quality | RTT | Packet Loss | Jitter |
|---------|-----|-------------|--------|
| `excellent` | < 80 ms | < 5 | < 10 ms |
| `good` | < 150 ms | < 20 | < 30 ms |
| `fair` | < 300 ms | < 50 | < 50 ms |
| `poor` | > 300 ms | > 50 | > 50 ms |
# TURN / STUN Configuration Guide

> **Service**: cybernetic-legion (CYRUS AI)  
> **File**: `cyrus-ui/src/lib/webrtc-service.ts`  
> **Backend**: `server/comms/socket-signaling.ts`

---

## Overview

WebRTC calls require ICE (Interactive Connectivity Establishment) to find a
network path between two peers.  In ideal conditions (same LAN, open NAT) a
direct peer-to-peer path is used.  In restrictive environments — corporate
firewalls, carrier-grade NAT, mobile networks — a TURN relay server is
required.

CYRUS uses a layered ICE server strategy:

| Priority | Type | Provider | Transport |
|----------|------|----------|-----------|
| 1 | STUN | Google (5 endpoints) | UDP |
| 2 | STUN | Cloudflare | UDP |
| 3 | STUN | Mozilla, Blackberry, stunprotocol | UDP |
| 4 | TURN | Metered / open-relay | UDP 80, UDP 3478 |
| 5 | TURN | Metered / open-relay | TCP 443 |
| 6 | TURN | Metered / open-relay | TLS 443 |
| 7 | TURN | Twilio (global PoPs) | UDP 3478, TCP 3478, TCP 443 |
| 8 | TURN | Numb / Citrix (fallback) | UDP 3478, TCP 3478 |
| 9 | TURN | Custom (env-configured) | any |

The browser tries all servers in parallel and uses the first viable candidate
pair.  ICE candidate pool size is set to **50** so gathering starts
immediately when a call begins.

---

## Environment Variables

Set these in your Railway / `.env` file to override or extend the defaults:

```env
# Custom / self-hosted TURN server (highest priority when set)
VITE_TURN_URL=turn:your-turn-server.example.com:3478
VITE_TURN_USER=your-username
VITE_TURN_CREDENTIAL=your-password

# Twilio TURN (replace demo credentials with your Twilio account values)
# Get credentials from: https://console.twilio.com/us1/develop/voice/turn-credentials
VITE_TWILIO_TURN_USER=your-twilio-turn-username
VITE_TWILIO_TURN_CREDENTIAL=your-twilio-turn-credential
```

> **Note**: Twilio TURN credentials are time-limited tokens.  For production
> use, generate them server-side via the Twilio REST API and pass them to the
> client at call setup time.

---

## Timeouts & Retry Configuration

| Parameter | Value | Location |
|-----------|-------|----------|
| ICE candidate pool size | 50 | `webrtc-service.ts` → `ICE_CANDIDATE_POOL_SIZE` |
| ICE gathering timeout | 20 s | `webrtc-service.ts` → `ICE_GATHERING_TIMEOUT_MS` |
| WebRTC handshake timeout | 30 s | `webrtc-service.ts` → `HANDSHAKE_TIMEOUT_MS` |
| Connection failure grace | 5 s | `webrtc-service.ts` → `CONNECTION_FAILURE_GRACE_MS` |
| Max ICE restart attempts | 3 | `webrtc-service.ts` → `MAX_ICE_RESTART_ATTEMPTS` |
| Server handshake watchdog | 30 s | `socket-signaling.ts` → `HANDSHAKE_WATCHDOG_MS` |

---

## Mobile Network Optimisation

On mobile networks (detected via `navigator.connection` or user-agent):

- **TCP/TLS TURN endpoints are moved to the front** of the ICE server list.
  UDP is frequently blocked on cellular networks; TCP 443 / TLS 443 bypass
  most mobile carrier restrictions.
- **Video resolution is reduced** to 640×480 @ 15 fps (vs 1280×720 @ 30 fps
  on desktop) to conserve bandwidth and reduce relay congestion.

---

## Troubleshooting Long-Distance Calls

### Symptom: Call connects locally but fails across networks

**Cause**: Symmetric NAT on one or both sides — STUN alone cannot traverse it.

**Fix**: Ensure TURN servers are reachable.  Run a connectivity test:

```bash
# Test UDP TURN reachability
nc -u openrelay.metered.ca 80

# Test TCP TURN reachability
nc -z openrelay.metered.ca 443

# Test TLS TURN reachability
openssl s_client -connect openrelay.metered.ca:443
```

If these fail from the server's network, the TURN server is blocked.  Deploy
a dedicated TURN server (see below) or use Twilio TURN.

---

### Symptom: ICE gathering timeout warning in logs

```
[WebRTC] ICE gathering still incomplete after 20s.
Check TURN server reachability.
```

**Cause**: TURN servers are not responding within the gathering window.

**Diagnosis**:
1. Check browser console for `[WebRTC] ICE connection state →` messages.
2. Look for `[Socket.IO] ICE diagnostic` entries in server logs.
3. Use `chrome://webrtc-internals` (Chrome) or `about:webrtc` (Firefox) to
   inspect candidate pairs and see which servers responded.

**Fix**:
- Set `VITE_TURN_URL` to a geographically closer TURN server.
- Use Twilio TURN (global PoPs, SLA-backed).
- Deploy a dedicated TURN server in the same region as your users.

---

### Symptom: Call drops after a few seconds on mobile

**Cause**: UDP path established initially but blocked by mobile carrier after
a few seconds (common on some 4G/5G networks).

**Fix**: The service automatically attempts ICE restart (up to 3 times) using
TCP/TLS TURN.  If restarts fail, the call ends gracefully.  To prevent this:
- Ensure TCP/TLS TURN endpoints are configured and reachable.
- Consider setting `iceTransportPolicy: "relay"` in restrictive environments
  (forces all traffic through TURN, avoids UDP issues at the cost of latency).

---

### Symptom: Poor quality on long-distance calls

**Cause**: High round-trip time (RTT) through TURN relay, or packet loss on
the relay path.

**Diagnosis**: Check `[WebRTC] Stats monitoring` logs for RTT and packet loss.
Connection quality is reported as `excellent / good / fair / poor`.

**Fix**:
- Deploy a TURN server geographically closer to your users.
- Reduce video bitrate by lowering the video constraints in `getMediaConstraints`.
- Use a CDN-backed TURN service (Twilio, Cloudflare Calls) for global coverage.

---

## Deploying a Dedicated TURN Server

For production deployments with many users or strict latency requirements,
run your own TURN server using [coturn](https://github.com/coturn/coturn).

### Quick setup (Ubuntu / Debian)

```bash
apt-get install coturn

# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=YOUR_PUBLIC_IP
realm=your-domain.com
server-name=your-domain.com
lt-cred-mech
user=cyrus:your-strong-password
cert=/etc/letsencrypt/live/your-domain.com/fullchain.pem
pkey=/etc/letsencrypt/live/your-domain.com/privkey.pem
log-file=/var/log/turnserver.log
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
```

```bash
systemctl enable coturn
systemctl start coturn
```

Then set in Railway:

```env
VITE_TURN_URL=turns:your-domain.com:5349
VITE_TURN_USER=cyrus
VITE_TURN_CREDENTIAL=your-strong-password
```

### Firewall rules required

| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 3478 | UDP + TCP | Inbound | TURN/STUN |
| 5349 | TCP | Inbound | TURNS (TLS) |
| 49152–65535 | UDP | Inbound | TURN relay media |

---

## Regional TURN Server Recommendations

| Region | Recommended Provider | Notes |
|--------|---------------------|-------|
| North America | Twilio TURN | Global PoPs, SLA |
| Europe | Twilio TURN or self-hosted (Frankfurt/Amsterdam) | GDPR-compliant |
| Asia-Pacific | Twilio TURN or self-hosted (Singapore/Tokyo) | High latency to US servers |
| Africa / Middle East | Self-hosted (closest AWS/GCP region) | Limited public TURN coverage |
| Mobile (global) | Twilio TURN via TCP 443 | Bypasses carrier UDP blocking |

---

## Network Diagnostics Tips

### Browser-side

1. Open `chrome://webrtc-internals` during a call.
2. Look at **ICE candidate pairs** — the selected pair shows the transport
   type (`host`, `srflx` = STUN, `relay` = TURN).
3. Check **Stats graphs** for RTT, packet loss, and jitter.
4. A `relay` candidate pair means TURN is being used — check the relay
   address to confirm which TURN server was selected.

### Server-side

Watch for these log patterns:

```
# Normal flow
[Socket.IO] Call accepted: Alice <-> Bob (room: room_xxx)
[Socket.IO] WebRTC offer relay: alice → bob
[Socket.IO] WebRTC answer relay: bob → alice

# ICE issues
[Socket.IO] ICE diagnostic from Alice: event=gathering-timeout ...
[Socket.IO] WebRTC handshake watchdog: room room_xxx still active after 30s

# ICE restart (network interruption recovered)
[Socket.IO] ICE restart relay: alice → bob
```

### Quick connectivity test from Node.js

```javascript
// Run this on your server to verify TURN reachability
const { RTCPeerConnection } = require("wrtc"); // npm install wrtc

const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" }
  ]
});
pc.createDataChannel("test");
pc.createOffer().then(o => pc.setLocalDescription(o));
pc.onicecandidate = e => {
  if (e.candidate) console.log("Candidate:", e.candidate.type, e.candidate.address);
  else console.log("Gathering complete");
};
setTimeout(() => { pc.close(); process.exit(0); }, 10000);
```

If you see `relay` candidates, TURN is working.  If you only see `host`
candidates, the TURN server is unreachable from your network.
