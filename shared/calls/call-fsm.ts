/**
 * Shared call FSM — guarded transitions (WhatsApp-style strict call lifecycle).
 */

import type { CallSessionStatus } from "./call-session-types";

const ALLOWED: Record<CallSessionStatus, readonly CallSessionStatus[]> = {
  ringing: ["connecting", "failed"],
  connecting: ["negotiating", "failed"],
  negotiating: ["connected", "reconnecting", "failed"],
  connected: ["reconnecting", "failed"],
  reconnecting: ["connected", "negotiating", "failed"],
  failed: [],
};

export function canTransitionCallStatus(
  from: CallSessionStatus,
  to: CallSessionStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertCallTransition(
  from: CallSessionStatus,
  to: CallSessionStatus,
): CallSessionStatus {
  if (!canTransitionCallStatus(from, to)) {
    if (typeof console !== "undefined") {
      console.warn(`[CallFSM] Illegal transition ${from} → ${to}`);
    }
    return from;
  }
  return to;
}

/** WhatsApp-like: media UI is "live" only after negotiation succeeds. */
export function callMediaShouldBeLive(status: CallSessionStatus): boolean {
  return status === "connected" || status === "reconnecting";
}
