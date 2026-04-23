/** Single place for dev/prod port defaults and CYRUS AI URL resolution. */

const DEFAULT_WEB_PORT = 3105;
const DEFAULT_AI_PORT = 8001;

/**
 * Single public port for the fused system (UI + API + HMR + sockets).
 * Prefer CYRUS_LIVE_PORT; PORT is kept identical via `syncFusedStackPortEnv()` at boot.
 */
export function getCyrusLivePort(): number {
  const raw = process.env.CYRUS_LIVE_PORT || process.env.PORT || String(DEFAULT_WEB_PORT);
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WEB_PORT;
}

export function getWebPort(): number {
  return getCyrusLivePort();
}

/** Primary browser URL for local fused dev (loopback + live port). */
export function getCyrusFusedOrigin(): string {
  const port = getCyrusLivePort();
  const proto = (process.env.PUBLIC_PROTOCOL || "http").replace(/\/$/, "");
  const host = "127.0.0.1";
  return `${proto}://${host}:${port}`;
}

/**
 * Host the HTTP server binds to. Mirrors `server/index.ts` behavior.
 */
export function getServerBindHost(): string {
  return (
    process.env.SERVER_HOST ||
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1")
  );
}

export function getCyrusAiPort(): number {
  const n = parseInt(process.env.CYRUS_AI_PORT || String(DEFAULT_AI_PORT), 10);
  return Number.isFinite(n) ? n : DEFAULT_AI_PORT;
}

export function getCyrusAiHost(): string {
  const h = (process.env.CYRUS_AI_HOST || "127.0.0.1").trim();
  return h || "127.0.0.1";
}

export type CyrusAiUrlSource = "CYRUS_AI_URL" | "CYRUS_MEMORY_SERVICE_URL" | "composed";

export function getCyrusAiUrlSource(): CyrusAiUrlSource {
  if (process.env.CYRUS_AI_URL?.trim()) return "CYRUS_AI_URL";
  if (process.env.CYRUS_MEMORY_SERVICE_URL?.trim()) return "CYRUS_MEMORY_SERVICE_URL";
  return "composed";
}

/**
 * Base URL for Python FastAPI (memory, brain, platform intelligence).
 */
export function getCyrusAiBaseUrl(): string {
  const explicit = process.env.CYRUS_AI_URL || process.env.CYRUS_MEMORY_SERVICE_URL;
  if (explicit && String(explicit).trim()) {
    return String(explicit).replace(/\/$/, "");
  }
  return `http://${getCyrusAiHost()}:${getCyrusAiPort()}`;
}

export function getViteStandalonePort(): number {
  const n = parseInt(process.env.CYRUS_UI_STANDALONE_PORT || "3000", 10);
  return Number.isFinite(n) ? n : 3000;
}

export function getStackPortsPayload() {
  const webPort = getWebPort();
  const bindHost = getServerBindHost();
  const fusedOrigin = getCyrusFusedOrigin();
  const aiBase = getCyrusAiBaseUrl();
  const aiPort = getCyrusAiPort();
  const aiHost = getCyrusAiHost();
  const source = getCyrusAiUrlSource();

  const displayUrls = [fusedOrigin];
  if (bindHost && bindHost !== "127.0.0.1" && bindHost !== "0.0.0.0") {
    const proto = (process.env.PUBLIC_PROTOCOL || "http").replace(/\/$/, "");
    displayUrls.push(`${proto}://${bindHost}:${webPort}`);
  }

  return {
    fused: {
      name: "CYRUS_LIVE_PORT",
      description:
        "One HTTP port for the whole CYRUS web system (cyrus-ui + REST + Vite middleware + Socket.IO). Python CYRUS AI stays on CYRUS_AI_PORT; Node proxies to it—browsers only need this port.",
      livePort: webPort,
      liveOrigin: fusedOrigin,
      envSyncedWithPort: true,
    },
    web: {
      port: webPort,
      bindHost,
      displayUrls,
    },
    cyrusAi: {
      baseUrl: aiBase,
      host: aiHost,
      port: aiPort,
      urlSource: source,
    },
    viteStandalone: {
      port: getViteStandalonePort(),
      note:
        "Used only when running `vite` inside cyrus-ui/ while API runs on web.port. Set CYRUS_API_PROXY_TARGET to match web.displayUrls[0].",
    },
    hints: [
      "Set CYRUS_LIVE_PORT once (PORT mirrors it). npm run dev → entire fused app on that port.",
      "Do not set VITE_CYRUS_API_BASE for fused dev—all requests stay same-origin.",
      "Example: {origin}/scan — see fused.liveOrigin from GET /api/stack/ports",
      "Algorithms: /algorithms · catalog: GET /api/algorithms/catalog",
      "Live Python core: npm run dev:live (CYRUS_AI_PORT internal; browser still uses CYRUS_LIVE_PORT only)",
      "Override AI backend: CYRUS_AI_URL=…",
    ],
  };
}

export function formatStackStartupBanner(): string[] {
  const p = getStackPortsPayload();
  return [
    `[CYRUS Fused] CYRUS_LIVE_PORT=${p.fused.livePort} → ${p.fused.liveOrigin} (bind ${p.web.bindHost})`,
    `[Stack] CYRUS AI (internal) → ${p.cyrusAi.baseUrl} (${p.cyrusAi.urlSource})`,
  ];
}
