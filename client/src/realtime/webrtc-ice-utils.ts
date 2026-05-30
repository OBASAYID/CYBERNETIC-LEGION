/** Shared ICE parsing for Socket.IO–signaled WebRTC (CYRUS Comms). */

export function toIceCandidateInit(raw: unknown): RTCIceCandidateInit | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candVal = o.candidate;
  if (candVal !== null && typeof candVal !== "string") return null;
  const c = candVal as string | undefined | null;
  if (c == null) return null;
  if (c === "") return null;
  if (!c.startsWith("candidate:")) {
    console.warn("[WebRTC] Skipping malformed ICE candidate line");
    return null;
  }
  const init: RTCIceCandidateInit = { candidate: c };
  if (typeof o.sdpMid === "string" || o.sdpMid === null) init.sdpMid = o.sdpMid as string | null;
  if (typeof o.sdpMLineIndex === "number") init.sdpMLineIndex = o.sdpMLineIndex;
  if (typeof o.usernameFragment === "string") init.usernameFragment = o.usernameFragment;
  return init;
}

export async function addIceCandidateSafe(pc: RTCPeerConnection, raw: unknown): Promise<void> {
  const init = toIceCandidateInit(raw);
  if (!init) return;
  try {
    await pc.addIceCandidate(init);
  } catch (e) {
    console.warn("[WebRTC] addIceCandidate failed (ignored):", e);
  }
}
