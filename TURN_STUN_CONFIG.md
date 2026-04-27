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
