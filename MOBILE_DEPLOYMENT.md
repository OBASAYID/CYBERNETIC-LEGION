# CYRUS Mobile Deployment — Local Shell, Production Server

CYRUS uses a **hybrid mobile architecture**: the app installs on the phone/tablet as a PWA, while AI, comms, database, and file storage run on your production server. After the one-time install, only small API payloads transfer — not the full app on every visit.

## Architecture

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Mobile device (local)  │         │  Production server (Hetzner) │
│  • PWA shell (~3 MB)    │  HTTPS  │  • AI / LLM inference        │
│  • Cached JS/CSS/icons  │ ◄─────► │  • PostgreSQL + Redis        │
│  • Service worker       │  API    │  • Comms / WebRTC signaling  │
└─────────────────────────┘         │  • File uploads / media      │
                                    └──────────────────────────────┘
```

## Quick start (mobile users)

1. Open **`https://167-233-36-99.sslip.io`** on your phone (Safari on iOS, Chrome on Android).
2. Log in with username + access code.
3. **Install the app:**
   - **iOS:** Share → **Add to Home Screen**
   - **Android:** Tap **Install** when prompted (or ⋮ → Install app)
4. Launch CYRUS from the home screen icon.

The installed app connects to the same production origin. UI assets are cached locally; all intelligence stays on the server.

## Operator setup (Hetzner)

### 1. Environment (`.env` on server)

```bash
PUBLIC_BASE_URL=https://167-233-36-99.sslip.io
ADMIN_ACCESS_CODE=71580019
USER_ACCESS_CODE=170392
SESSION_SECRET=<random-32-chars>
DATABASE_URL=postgresql://cyrus:...@postgres:5432/cyrus_ai
REDIS_URL=redis://redis:6379
```

### 2. Build and deploy

From your dev machine:

```bash
./scripts/deploy-mobile-pwa.sh
```

Or manually on the server:

```bash
cd ~/cyrus-ai
git pull origin main
docker compose -f docker-compose.production.yml up -d --build
```

### 3. Verify

```bash
curl -s https://167-233-36-99.sslip.io/api/stack/mobile | jq .
curl -s https://167-233-36-99.sslip.io/api/ready
```

## What gets cached vs. what stays on server

| Cached on device (after install) | Always on server |
|----------------------------------|------------------|
| UI shell, React chunks           | AI / LLM queries |
| Icons, fonts, static images      | Database sessions |
| Service worker bootstrap         | Comms / calls / chat |
|                                  | Large file uploads |

Workbox is configured with **NetworkOnly** for `/api/*`, `/health/*`, and WebSocket paths so API responses are never stale-cached.

## API discovery

- `GET /api/stack/mobile` — install URL, architecture, data-transfer summary
- `GET /api/stack/deployment` — full deployment payload including `mobileShell`

## Local development

- `npm run dev` — fused UI + API on one port (default 3105)
- PWA service worker is **disabled in dev** (`vite.config.ts` → `devOptions.enabled: false`)
- Test mobile install against production URL, not localhost (HTTPS + valid origin required for install prompts)

## Optional: native app stores (Capacitor)

For App Store / Play Store distribution, wrap the same web shell with Capacitor (not scaffolded in-repo). The wrapper still points API calls at `PUBLIC_BASE_URL`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No install prompt | Use HTTPS production URL; iOS requires Safari |
| Login works in browser but not installed app | Clear site data; reinstall from production URL |
| Stale UI after deploy | Hard refresh once; SW auto-updates (`registerType: autoUpdate`) |
| High data usage | Ensure install is from production PWA, not bookmark to dev server |
