/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Optional external CYRUS / Replit API (e.g. `http://localhost:3001`). Empty = same-origin. */
  readonly VITE_CYRUS_API_BASE?: string;
  /** Max ms for single auth/health API fetch before abort (default 8000). */
  readonly VITE_API_FETCH_TIMEOUT_MS?: string;
  /**
   * Must match server `CYRUS_COMM_WS_TOKEN` when that env is set; appended as `token` on `/ws` queries
   * (signaling hardening for public deployments).
   */
  readonly VITE_CYRUS_COMM_WS_TOKEN?: string;
}
