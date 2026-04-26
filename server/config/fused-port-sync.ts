/**
 * Fused stack: one public HTTP port for UI + /api + Vite + sockets (single origin).
 * Canonical env name: CYRUS_LIVE_PORT. PORT is kept in sync for Express/tooling compatibility.
 */

const DEFAULT_LIVE_PORT = 3105;

/**
 * Call once after `dotenv.config()` so .env values are loaded.
 * - If only CYRUS_LIVE_PORT is set → copies to PORT.
 * - If only PORT is set → copies to CYRUS_LIVE_PORT.
 * - If both differ → PORT wins; CYRUS_LIVE_PORT is overwritten (PaaS routing compatibility).
 * - If neither → both default to DEFAULT_LIVE_PORT.
 */
export function syncFusedStackPortEnv(): void {
  const liveRaw = process.env.CYRUS_LIVE_PORT?.trim();
  const portRaw = process.env.PORT?.trim();

  if (liveRaw && portRaw && liveRaw !== portRaw) {
    const portNum = parseInt(portRaw, 10);
    const liveNum = parseInt(liveRaw, 10);

    // PaaS (Render, Fly, etc.) injects PORT for routing. Never let CYRUS_LIVE_PORT
    // override it or the proxy will return 502 while the app listens elsewhere.
    if (Number.isFinite(portNum) && portNum > 0) {
      console.warn(
        `[CYRUS Fused] PORT (${portRaw}) != CYRUS_LIVE_PORT (${liveRaw}); using PORT for HTTP bind (platform compatibility).`,
      );
      process.env.CYRUS_LIVE_PORT = String(portNum);
      process.env.PORT = String(portNum);
      return;
    }

    if (Number.isFinite(liveNum) && liveNum > 0) {
      console.warn(
        `[CYRUS Fused] PORT (${portRaw}) is invalid while CYRUS_LIVE_PORT (${liveRaw}) is valid; using CYRUS_LIVE_PORT.`,
      );
      process.env.CYRUS_LIVE_PORT = String(liveNum);
      process.env.PORT = String(liveNum);
      return;
    }

    console.warn(
      `[CYRUS Fused] Both PORT (${portRaw}) and CYRUS_LIVE_PORT (${liveRaw}) are invalid; falling back to ${DEFAULT_LIVE_PORT}.`,
    );
    process.env.CYRUS_LIVE_PORT = String(DEFAULT_LIVE_PORT);
    process.env.PORT = String(DEFAULT_LIVE_PORT);
    return;
  }

  if (liveRaw) {
    const n = parseInt(liveRaw, 10);
    if (Number.isFinite(n) && n > 0) {
      process.env.CYRUS_LIVE_PORT = String(n);
      process.env.PORT = String(n);
      return;
    }
  }

  if (portRaw) {
    const n = parseInt(portRaw, 10);
    if (Number.isFinite(n) && n > 0) {
      process.env.PORT = String(n);
      process.env.CYRUS_LIVE_PORT = String(n);
      return;
    }
  }

  process.env.CYRUS_LIVE_PORT = String(DEFAULT_LIVE_PORT);
  process.env.PORT = String(DEFAULT_LIVE_PORT);
}
