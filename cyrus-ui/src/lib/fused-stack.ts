/**
 * Fused stack (architecture map — keep in sync when re-wiring).
 *
 * - **Runtime (recommended):** `npm run dev` → `server/index.ts` binds **`CYRUS_LIVE_PORT`** (synced with `PORT`; default 3020), runs `initializeSystem()` (auth, fusion stubs, `/api` auth middleware, routes), then `setupVite()` so UI+HMR+API share **one origin**.
 * - **Shell:** `cyrus-ui/` — gate (`password-gate`), `App.tsx` session probe, React Router + Command Center lazy imports from `client/` (e.g. Comms: chat, Pshare feed, calls).
 * - **API surface:** `system-api.ts` resolves URLs + cookies; `fetch-fusion-bootstrap.ts` patches `fetch` for split-origin lazy bundles. Server gates `/api` with `SYSTEM_INITIALIZING` until `systemReady`.
 * - **Public auth paths:** `server/security/middleware.ts` allowlist includes login + fusion bootstrap/handshake so ordering glitches never block the gate.
 * - **Optional:** `cyrus-ai/` via `npm run dev:stack:*`.
 */
export const FUSED_STACK = {
  shell: "cyrus-ui",
  commandCenterPages: "client/src/pages",
  apiServer: "server",
  pythonCore: "cyrus-ai",
} as const;

export type FusedStack = typeof FUSED_STACK;
