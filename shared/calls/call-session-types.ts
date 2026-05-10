/**
 * Deterministic CYRUS call session phases (single source of truth for UI + telemetry).
 * UI must not show a fully "live" call until status is at least `connected` after media checks.
 */

export type CallSessionStatus =
  | "ringing"
  | "connecting"
  | "negotiating"
  | "connected"
  | "reconnecting"
  | "failed";

/** True when the full-screen call shell should be visible (media may still be establishing). */
export function callShellVisible(status: CallSessionStatus): boolean {
  return (
    status === "connecting" ||
    status === "negotiating" ||
    status === "connected" ||
    status === "reconnecting"
  );
}

/** True when ICE + DTLS are in a stable connected path (browser reported). */
export function isIcePathLive(state: RTCIceConnectionState): boolean {
  return state === "connected" || state === "completed";
}
