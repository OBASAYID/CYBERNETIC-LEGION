/**
 * Fused stack: one public HTTP port for UI + /api + Vite + sockets (single origin).
 * Canonical env name: CYRUS_LIVE_PORT. PORT is kept in sync for Express/tooling compatibility.
 */

const DEFAULT_LIVE_PORT = 3105;

/**
 * Call once after `dotenv.config()` so .env values are loaded.
 * - If only CYRUS_LIVE_PORT is set → copies to PORT.
 * - If only PORT is set → copies to CYRUS_LIVE_PORT.
 * - If both differ → CYRUS_LIVE_PORT wins; PORT is overwritten (warning logged).
 * - If neither → both default to DEFAULT_LIVE_PORT.
 */
export function syncFusedStackPortEnv(): void {
  const liveRaw = process.env.CYRUS_LIVE_PORT?.trim();
  const portRaw = process.env.PORT?.trim();

  if (liveRaw && portRaw && liveRaw !== portRaw) {
    console.warn(
      `[CYRUS Fused] PORT (${portRaw}) != CYRUS_LIVE_PORT (${liveRaw}); using CYRUS_LIVE_PORT for one-port system.`,
    );
    process.env.PORT = liveRaw;
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
