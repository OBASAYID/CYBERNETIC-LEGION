/**
 * CYRUS Comms Protocol v1 — WhatsApp-grade signaling envelope.
 *
 * Design goals (aligned with modern messenger engineering):
 * - Server relays opaque ciphertext for WebRTC SDP/ICE (cannot read negotiation).
 * - Versioned envelopes for forward-compatible clients.
 * - Plaintext legacy path retained for older peers during rollout.
 */

export const CYRUS_COMMS_PROTOCOL_VERSION = 1 as const;

/** AES-GCM sealed blob — only call participants can open. */
export type CyrusSealedPayload = {
  v: typeof CYRUS_COMMS_PROTOCOL_VERSION;
  iv: string;
  ciphertext: string;
};

/** Ephemeral ECDH public key (P-256 JWK) exchanged before sealed SDP. */
export type CyrusCryptoHandshake = {
  v: typeof CYRUS_COMMS_PROTOCOL_VERSION;
  publicKey: JsonWebKey;
};

export type CyrusWebRtcSignalKind = "offer" | "answer" | "ice-candidate";

/** Inner plaintext after unsealing (never sent on wire in sealed mode). */
export type CyrusWebRtcSignalBody =
  | { kind: "offer"; offer: RTCSessionDescriptionInit }
  | { kind: "answer"; answer: RTCSessionDescriptionInit }
  | { kind: "ice-candidate"; candidate: RTCIceCandidateInit | RTCIceCandidate };

export type CyrusWebRtcRelayPayload = {
  roomId: string;
  targetPeerId?: string;
  fromPeerId?: string;
  /** Legacy — server can read SDP (deprecated). */
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit | RTCIceCandidate;
  /** Preferred — server-blind ciphertext. */
  sealed?: CyrusSealedPayload;
};

export type CyrusCryptoHandshakeRelay = {
  roomId: string;
  targetPeerId?: string;
  fromPeerId?: string;
  handshake: CyrusCryptoHandshake;
};

export function isSealedPayload(x: unknown): x is CyrusSealedPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.v === CYRUS_COMMS_PROTOCOL_VERSION &&
    typeof o.iv === "string" &&
    typeof o.ciphertext === "string"
  );
}
