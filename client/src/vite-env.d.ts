/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  /** JSON array of RTCIceServer objects; merged with defaults unless VITE_RTC_APPEND_DEFAULT_ICE=false */
  readonly VITE_RTC_ICE_SERVERS_JSON?: string;
  /** When "false", only VITE_RTC_ICE_SERVERS_JSON is used (no public STUN/TURN fallback). */
  readonly VITE_RTC_APPEND_DEFAULT_ICE?: string;
  /** Force ICE relay (TURN) — helps symmetric NAT / strict carriers; uses more TURN bandwidth. */
  readonly VITE_RTC_PREFER_RELAY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
