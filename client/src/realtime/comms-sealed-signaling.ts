/**
 * WhatsApp-grade sealed WebRTC signaling — encrypt before emit, decrypt on receive.
 */

import type { Socket } from "socket.io-client";
import type {
  CyrusCryptoHandshakeRelay,
  CyrusWebRtcRelayPayload,
  CyrusWebRtcSignalBody,
} from "@shared/comms/cyrus-comms-envelope";
import { isSealedPayload } from "@shared/comms/cyrus-comms-envelope";
import { CommsCallCryptoSession } from "./comms-call-crypto";

const WEBRTC_OFFER_EVENTS = ["webrtc:offer", "webrtc-offer"] as const;
const WEBRTC_ANSWER_EVENTS = ["webrtc:answer", "webrtc-answer"] as const;
const WEBRTC_ICE_EVENTS = ["webrtc:ice-candidate", "webrtc-ice-candidate"] as const;
const CRYPTO_HANDSHAKE_EVENTS = ["webrtc-crypto-handshake", "webrtc:crypto-handshake"] as const;

export type SealedSignalingContext = {
  roomId: string;
  targetPeerId?: string;
  socket: Socket;
  crypto: CommsCallCryptoSession;
  ready: Promise<void>;
  onHandshake: (data: CyrusCryptoHandshakeRelay) => void;
};

export async function createSealedSignalingContext(
  socket: Socket,
  roomId: string,
  targetPeerId?: string,
  handshakeTimeoutMs = 8_000,
): Promise<SealedSignalingContext> {
  const crypto = await CommsCallCryptoSession.create();
  let resolveReady!: () => void;
  const ready = new Promise<void>((res) => {
    resolveReady = res;
  });

  const onHandshake = async (data: CyrusCryptoHandshakeRelay) => {
    if (data.roomId !== roomId || !data.handshake) return;
    try {
      await crypto.acceptPeerHandshake(data.handshake);
      resolveReady();
    } catch (e) {
      console.warn("[CallCrypto] Peer handshake failed:", e);
    }
  };

  for (const evt of CRYPTO_HANDSHAKE_EVENTS) {
    socket.on(evt, onHandshake);
  }

  const payload: CyrusCryptoHandshakeRelay = {
    roomId,
    targetPeerId,
    handshake: crypto.handshakePayload(),
  };
  for (const evt of CRYPTO_HANDSHAKE_EVENTS) {
    socket.emit(evt, payload);
  }

  const timer = window.setTimeout(() => {
    // Degrade to legacy plaintext relay if peer is older or handshake is slow.
    resolveReady();
  }, handshakeTimeoutMs);

  ready
    .then(() => window.clearTimeout(timer))
    .catch(() => window.clearTimeout(timer));

  return {
    roomId,
    targetPeerId,
    socket,
    crypto,
    ready,
    onHandshake,
  };
}

export function disposeSealedSignalingContext(ctx: SealedSignalingContext | null): void {
  if (!ctx) return;
  for (const evt of CRYPTO_HANDSHAKE_EVENTS) {
    ctx.socket.off(evt, ctx.onHandshake);
  }
}

export async function emitSealedWebRtcSignal(
  ctx: SealedSignalingContext,
  body: CyrusWebRtcSignalBody,
): Promise<void> {
  await ctx.ready;
  const sealed = await ctx.crypto.seal(body);
  const payload: CyrusWebRtcRelayPayload = {
    roomId: ctx.roomId,
    targetPeerId: ctx.targetPeerId,
    sealed,
  };
  const events =
    body.kind === "offer"
      ? WEBRTC_OFFER_EVENTS
      : body.kind === "answer"
        ? WEBRTC_ANSWER_EVENTS
        : WEBRTC_ICE_EVENTS;
  for (const evt of events) {
    ctx.socket.emit(evt, payload);
  }
}

/** Resolve offer/answer/candidate from relay payload (sealed preferred, legacy fallback). */
export async function resolveWebRtcRelayPayload(
  crypto: CommsCallCryptoSession | null,
  data: CyrusWebRtcRelayPayload,
): Promise<CyrusWebRtcSignalBody | null> {
  if (data.sealed && isSealedPayload(data.sealed)) {
    if (!crypto?.isReady) return null;
    return crypto.open(data.sealed);
  }
  if (data.offer) return { kind: "offer", offer: data.offer };
  if (data.answer) return { kind: "answer", answer: data.answer };
  if (data.candidate !== undefined) {
    return { kind: "ice-candidate", candidate: data.candidate as RTCIceCandidateInit };
  }
  return null;
}
