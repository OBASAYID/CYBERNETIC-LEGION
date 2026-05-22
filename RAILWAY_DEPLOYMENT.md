# Railway Deployment (Bun)

This project is configured to deploy on Railway using Bun and `Dockerfile.railway`.

## Build and runtime

- Builder: Dockerfile (`Dockerfile.railway`)
- Build command: `bun run build` (inside the Dockerfile)
- Start command: `bun dist/server/index.js` (see `railway.toml` `deploy.startCommand`)
- Health check path: `/health/live` (Railway `healthcheckPath` in `railway.toml` — liveness only)

Optional manual checks after deploy:

- `GET /health/ready` — includes DB `SELECT 1`; returns 503 if Postgres is unreachable (useful for debugging, not required for Railway’s default health probe).
- `GET /api/cyrus-comm/config/webrtc` — returns JSON `iceServers` / `sfu` for the **unified Comms mesh** layer (should return 200).

## CYRUS Comm mesh (WebRTC) — same Railway service

The **main app** includes a second real-time layer (no extra container):

| Surface | Path | Purpose |
|--------|------|--------|
| Command Center UI | **Comms** (mesh strip, **People**, **Calls**) | WebRTC voice/video, parallel mesh DM, live location (browser) |
| Socket.IO | **`/cyrus-comm-io`** | Signaling (WebSocket + polling; parallel to **`/cyrus-io`** presence) |
| REST | **`/api/cyrus-comm/config/webrtc`** | STUN/TURN list for mesh WebRTC |

Railway terminates TLS in front of your process; the app listens on **`PORT`** (injected). Same-origin requests from the deployed UI hit these paths automatically. No Railway plugin is required beyond your existing web service.

**TURN (recommended for production WebRTC** when users are on strict NATs): set on the **web** service (read by `server/comms/cyrus-comm-config.ts`):

- `TURN_URLS` — comma-separated URLs, e.g. `turn:turn.example.com:3478,turns:turn.example.com:5349`
- `TURN_USERNAME` — coturn / TURN user
- `TURN_CREDENTIAL` — coturn / TURN password

If unset, clients still get Google STUN only (fine for lab; often insufficient for all peers in the field).

See also `TURN_STUN_CONFIG.md` for broader WebRTC notes.

## Required Railway environment variables

`DATABASE_URL` is **mandatory**: `server/db.ts` throws at startup if it is missing. Add a Railway **Postgres** plugin (or external DB) and reference its connection string (often `${{Postgres.DATABASE_URL}}` or the variable name Railway generates).

Set these on the **web** service:

- `NODE_ENV=production`
- `SESSION_SECRET=<long-random-secret>`
- `ADMIN_ACCESS_CODE=<admin-code>`
- `USER_ACCESS_CODE=<user-code>`
- `DATABASE_URL=<postgres-connection-string>`
- `BASE_URL=https://<your-public-host>` — canonical public URL (cookies, redirects, trusted origins; align with what users type in the browser)
- `CORS_ORIGIN=https://<your-public-host>` — should match your deployed frontend origin (often same as `BASE_URL` for a single-service deploy)

`PUBLIC_BASE_URL` exists in legacy `config/index.js` only; prefer **`BASE_URL`** for server behavior documented in `server/cors-trusted.ts` / `server/index.ts`.

AI (pick one pattern):

- `OPENAI_API_KEY=<key>` and/or `AI_INTEGRATIONS_OPENAI_API_KEY=<key>` (server aligns both when one is set from `.env`; set either or both in Railway as needed)
- Or `USE_LOCAL_LLM=true` if you intentionally run without OpenAI

Feature flags:

- `CYRUS_ENABLE_PYTHON=0` (full Quantum Python bridge; heavy — leave off unless you need it)
- `CYRUS_ENABLE_COMMS_ML=1` (recommended for **Comms ML**: sentiment, behavior/anomaly helpers — runs `ml_service.py` in the same container)
- `ENABLE_REUSE_PORT=false`

When `CYRUS_ENABLE_COMMS_ML=1`, you do not need `COMMS_ML_URL` unless the ML service runs on another host; the app defaults to `http://127.0.0.1:5002`.

Optional hardening:

- `CYRUS_SESSION_TOKEN_SECRET` — if you use signed session tokens beyond `SESSION_SECRET`
- WebRTC / TURN: set any `ICE` / TURN env vars your deployment requires (see project `.env.example` for names)

## Pre-deploy checklist

1. Postgres plugin (or external DB) attached; `DATABASE_URL` set on the app service.
2. Do **not** set a fixed `PORT` or conflicting `CYRUS_LIVE_PORT` — Railway injects `PORT`; the app syncs fused stack ports from it.
3. `BASE_URL` and `CORS_ORIGIN` match your real HTTPS origin (avoids cookie / CORS surprises).
4. Strong `SESSION_SECRET` and access codes in production.
5. After first deploy: `GET /health/live` returns 200; open the app and confirm login.
6. Optional: open **Comms** from two clients, join mesh, start a mesh call from **People**, and confirm `GET /api/cyrus-comm/config/webrtc` returns ICE config; add **TURN_*** variables if calls fail for some networks.

## Important notes

- Do not hardcode `PORT` in Railway variables. Railway injects it.
- Do not set `CYRUS_LIVE_PORT` to a different value than Railway `PORT`.
- Leave `FRONTEND_STATIC_DIR` unset unless you intentionally override static detection.

## Railway service setup

1. Connect your Git repository.
2. Branch: `main` (or your active deploy branch).
3. Ensure the service root is the repository root (where `railway.toml` and `Dockerfile.railway` live).
4. Confirm Railway uses `railway.toml` (`builder = "dockerfile"`, `dockerfilePath = "Dockerfile.railway"`).
5. Deploy and verify:
   - `GET /health/live` returns 200
   - Optionally `GET /health/ready` returns 200 when DB is up
   - App loads and login works with your access code
