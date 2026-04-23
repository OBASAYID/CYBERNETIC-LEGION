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
- **Readiness:** `GET /api/ready` or `GET /health/ready` (503 + `SYSTEM_INITIALIZING` while booting).

## UI ↔ server wiring (do not duplicate)

1. **`cyrus-ui/src/lib/system-api.ts`** — re-exports `systemFetch` / `systemApiUrl` / `systemCredentials` from **`shared/cyrus-api-client.ts`** (single implementation for same-origin and `VITE_CYRUS_API_BASE`). Use for explicit calls (gate, session, fusion, React Query in `queryClient.ts`).
2. **`cyrus-ui/src/lib/fetch-fusion-bootstrap.ts`** — optional global `fetch` patch when `VITE_CYRUS_API_BASE` is set (lazy `client/` bundles).
3. **`cyrus-ui/src/lib/fused-stack.ts`** — short architecture map; keep it accurate when you change boot order.
4. **`client/`** — use `@shared/cyrus-api-client` (`systemFetch`) for `/api/*` calls (Command Center, Dashboard, comms, hooks, `cyrusApi.request`). Leave plain `fetch` only for non-API URLs (e.g. blob/audio URLs).

Leave **`VITE_CYRUS_API_BASE` unset** for normal local single-port dev.

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
