# CYRUS — agent / editor context

Use this file so **any** coding assistant (Cursor, VS Code, web UIs) shares the same mental model. Prefer facts over product marketing language.

## Layout

| Area | Role |
|------|------|
| `server/` | Express API, auth, sockets, Vite middleware in dev (`setupVite`). Entry: `server/index.ts`. |
| `cyrus-ui/` | Primary web shell (gate, dashboard, trading). Vite root when `CYRUS_UI_ROOT=cyrus-ui` (default `npm run dev`). |
| `client/` | Command Center pages lazy-loaded from `cyrus-ui` (`command-center-routes.tsx`). |
| `shared/` | Cross-package types/schemas. |
| `standalone/auth-adapter.ts` | Default auth when **not** on Replit (`REPL_ID` unset). |

## Run and URL

- **Integrated dev:** repo root `npm run dev` → UI + API + HMR on **`http://127.0.0.1:${CYRUS_LIVE_PORT:-${PORT:-3020}}/`** (single origin). Prefer **`CYRUS_LIVE_PORT`** as the one env name; `PORT` mirrors it at boot. Example: **`http://127.0.0.1:3020/scan`**.
- **Mobile / installable:** production `npm run build` enables a **PWA** (web app manifest + service worker via `vite-plugin-pwa` in root `vite.config.ts`). After deploy, use the browser **Install** / **Add to Home Screen** action; APIs still require network. For **store** distribution, wrap the same web app with **Capacitor** (not scaffolded in-repo).
- **Readiness:** `GET /api/ready` or `GET /health/ready` (503 + `SYSTEM_INITIALIZING` while booting).

## UI ↔ server wiring (do not duplicate)

1. **`cyrus-ui/src/lib/system-api.ts`** — re-exports `systemFetch` / `systemApiUrl` / `systemCredentials` from **`shared/cyrus-api-client.ts`** (single implementation for same-origin and `VITE_CYRUS_API_BASE`). Use for explicit calls (gate, session, fusion, React Query in `queryClient.ts`).
2. **`cyrus-ui/src/lib/fetch-fusion-bootstrap.ts`** — optional global `fetch` patch when `VITE_CYRUS_API_BASE` is set (lazy `client/` bundles).
3. **`cyrus-ui/src/lib/fused-stack.ts`** — short architecture map; keep it accurate when you change boot order.
4. **`client/`** — use `@shared/cyrus-api-client` (`systemFetch`) for `/api/*` calls (Command Center, Dashboard, comms, hooks, `cyrusApi.request`). Leave plain `fetch` only for non-API URLs (e.g. blob/audio URLs).

Leave **`VITE_CYRUS_API_BASE` unset** for normal local single-port dev.

## Multi-device / universal deployment

- **Public origin:** set **`PUBLIC_BASE_URL`** (or **`BASE_URL`**) to the HTTPS URL users open — not `127.0.0.1`. Cookies, WebRTC, and mobile installs depend on this.
- **Identity:** **`userId`** = account from auth session (same on every device); **`deviceId`** = per-browser install (`shared/cyrus-identity.ts`, `client/src/lib/cyrus-identity.ts`). Comms registers both; socket map is keyed per device.
- **Sessions:** use **`DATABASE_URL`** + **`CYRUS_SESSION_STORE=postgresql`** in production so logins persist across server restarts and devices.
- **Sidecars:** set **`CYRUS_AI_URL`**, **`COMMS_ML_URL`**, **`REDIS_URL`** to service hostnames — not loopback — when API runs in containers.
- **Calls (WAN):** **`TURN_URLS`** + **`CYRUS_SFU_ANNOUNCED_IP`** for cross-network group/1:1 media.
- **Group SFU:** **`npm run sfu:install`** fetches mediasoup-worker prebuild; **`npm run sfu:verify`** checks worker. Linux/Docker/Apple Silicon supported; Intel Mac falls back to star relay. Production: open UDP **`CYRUS_SFU_RTC_MIN_PORT`–`CYRUS_SFU_RTC_MAX_PORT`**.
- **Ops probe:** **`GET /api/stack/deployment`** — public URL, session mode, TURN/SFU flags (no secrets).

## Auth branches

- **`process.env.REPL_ID`** → `server/replit_integrations/auth` (hosted Replit stack).
- **Else** → `standalone/auth-adapter.ts` (access codes + express-session).

## Language / comments

- Prefer **neutral** terms: “secondary API host”, “split-origin dev”, “hosted auth”, not “Replit AI” or “Copilot”, unless the code path is literally Replit-only.
- Comments explain **why** and **invariants**; avoid long tutorial prose in source files.
- Replit-only Vite plugins in `cyrus-ui/vite.config.ts` run only when `REPL_ID` is defined; local Cursor work ignores them.

## Checks

```bash
npm run typecheck:all
```

---

When unsure, read **`server/index.ts`** (boot + `systemReady`) and **`cyrus-ui/src/lib/system-api.ts`** before adding new `fetch` calls.
