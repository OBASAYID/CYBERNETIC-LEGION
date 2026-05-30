/** Tunables for P2P ICE recovery (Phase 2) + production stabilization. */
export const CYRUS_ICE_RESTART_MAX_ATTEMPTS = 2;
/** ms to wait after restartIce before counting a failed recovery attempt */
export const CYRUS_ICE_RESTART_VERIFY_MS = 10_000;

/** Minimum gap between automatic ICE restarts (anti storm). */
export const CYRUS_ICE_RESTART_COOLDOWN_MS = 8_000;
/** If ICE stays in `checking` longer than this, trigger recovery. */
export const CYRUS_ICE_CHECKING_STUCK_MS = 18_000;
/** Packet loss % (rolling) above which we may restart ICE. */
export const CYRUS_PACKET_LOSS_RESTART_PCT = 8;
/** Video bitrate (kbps) below this for BITRATE_FROZEN_MS while live → possible restart. */
export const CYRUS_BITRATE_FROZEN_KBPS = 45;
/** Duration bitrate must stay frozen before recovery (ms). */
export const CYRUS_BITRATE_FROZEN_MS = 10_000;
/** After this many auto-restarts, switch current call to relay + ICE restart. */
export const CYRUS_RESTARTS_BEFORE_RELAY_ESCALATION = 2;
/** Extended restart budget after relay escalation hint (same call). */
export const CYRUS_ICE_RESTART_MAX_ATTEMPTS_ESCALATED = 4;
