/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional external CYRUS / Replit API (e.g. `http://localhost:3001`). Empty = same-origin. */
  readonly VITE_CYRUS_API_BASE?: string;
  /** Max ms for single auth/health API fetch before abort (default 8000). */
  readonly VITE_API_FETCH_TIMEOUT_MS?: string;
}
