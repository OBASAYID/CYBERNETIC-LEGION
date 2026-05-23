/**
 * Optional split-origin fusion: same route layout on another host (see `VITE_CYRUS_API_BASE`).
 * Used by fetch bootstrap and any explicit API helpers.
 */
export {
  getCyrusApiBase,
  resolveCyrusApiUrl,
  resolveCyrusApiCredentials,
} from "@shared/cyrus-api-client";
