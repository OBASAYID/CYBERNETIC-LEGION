/**
 * WhatsApp-grade sealed WebRTC signaling — encrypt before emit, decrypt on receive.
 * Enhanced with better timeout handling, retry logic, and connection recovery.
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

const DEFAULT_HANDSHAKE_TIMEOUT_MS = 8_000;
const MAX_HANDSHAKE_RETRIES = 2;
const HANDSHAKE_RETRY_DELAY_MS = 1_500;

/** Opt-in only — default off so plaintext SDP/ICE relay stays reliable. */
export function isCommsSealedSignalingEnabled(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_CYRUS_COMMS_SEALED === "1") {
    return true;
  }
  try {
    return localStorage.getItem("cyrus-comms-sealed") === "1";
  } catch {
    return false;
  }
}

export interface SealedSignalingContext {
  roomId: string;
  targetPeerId?: string;
  socket: Socket;
  crypto: CommsCallCryptoSession;
  ready: Promise<void>;
  onHandshake: (data: CyrusCryptoHandshakeRelay) => void;
  dispose: () => void;
  isReady: boolean;
  retryCount: number;
}

export async function createSealedSignalingContext(
  socket: Socket,
  roomId: string,
  targetPeerId?: string,
  handshakeTimeoutMs = DEFAULT_HANDSHAKE_TIMEOUT_MS,
): Promise<SealedSignalingContext> {
  const crypto = await CommsCallCryptoSession.create();
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  let isReadyResolved = false;
  let retryCount = 0;

  const ready = new Promise<void>((res, rej) => {
    resolveReady = () => {
      if (!isReadyResolved) {
        isReadyResolved = true;
        res();
      }
    };
    rejectReady = (error: Error) => {
      if (!isReadyResolved) {
        isReadyResolved = true;
        rej(error);
      }
    };
  });

  const onHandshake = async (data: CyrusCryptoHandshakeRelay) => {
    if (data.roomId !== roomId || !data.handshake) return;
    try {
      await crypto.acceptPeerHandshake(data.handshake);
      console.log("[SealedSignaling] Peer handshake accepted for room:", roomId);
      resolveReady();
    } catch (e) {
      console.warn("[SealedSignaling] Peer handshake failed:", e);
      // Don't reject - will fall back to plaintext
    }
  };

  // Register handshake listeners
  for (const evt of CRYPTO_HANDSHAKE_EVENTS) {
    socket.on(evt, onHandshake);
  }

  // Send initial handshake
  const sendHandshake = () => {
    const payload: CyrusCryptoHandshakeRelay = {
      roomId,
      targetPeerId,
      handshake: crypto.handshakePayload(),
    };
    for (const evt of CRYPTO_HANDSHAKE_EVENTS) {
      socket.emit(evt, payload);
    }
    console.log(`[SealedSignaling] Handshake sent for room: ${roomId} (attempt ${retryCount + 1})`);
  };

  sendHandshake();

  // Retry mechanism
  const retryHandshake = async () => {
    if (isReadyResolved || retryCount >= MAX_HANDSHAKE_RETRIES) return;
    
    retryCount++;
    await new Promise((resolve) => setTimeout(resolve, HANDSHAKE_RETRY_DELAY_MS));
    
    if (!isReadyResolved) {
      console.log(`[SealedSignaling] Retrying handshake (${retryCount}/${MAX_HANDSHAKE_RETRIES})...`);
      sendHandshake();
      
      if (retryCount < MAX_HANDSHAKE_RETRIES) {
        retryHandshake();
      }
    }
  };

  // Start retry loop
  retryHandshake();

  // Timeout fallback
  const timer = window.setTimeout(() => {
    if (!isReadyResolved) {
      console.log(
        `[SealedSignaling] Handshake timeout after ${handshakeTimeoutMs}ms, falling back to plaintext relay`,
      );
      // Degrade gracefully to legacy plaintext relay if peer is older or handshake is slow
      resolveReady();
    }
  }, handshakeTimeoutMs);

  // Cleanup timer on resolution
  ready
    .then(() => {
      window.clearTimeout(timer);
      console.log("[SealedSignaling] Context ready for room:", roomId);
    })
    .catch((error) => {
      window.clearTimeout(timer);
      console.error("[SealedSignaling] Context failed for room:", roomId, error);
    });

  const dispose = () => {
    for (const evt of CRYPTO_HANDSHAKE_EVENTS) {
      socket.off(evt, onHandshake);
    }
    window.clearTimeout(timer);
  };

  return {
    roomId,
    targetPeerId,
    socket,
    crypto,
    ready,
    onHandshake,
    dispose,
    get isReady() {
      return isReadyResolved;
    },
    retryCount,
  };
}

export function disposeSealedSignalingContext(ctx: SealedSignalingContext | null): void {
  if (!ctx) return;
  console.log("[SealedSignaling] Disposing context for room:", ctx.roomId);
  ctx.dispose();
}

export async function emitSealedWebRtcSignal(
  ctx: SealedSignalingContext,
  body: CyrusWebRtcSignalBody,
  maxRetries = 1,
): Promise<void> {
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
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
      
      console.log(`[SealedSignaling] Emitted ${body.kind} for room: ${ctx.roomId}`);
      return; // Success
    } catch (error) {
      attempts++;
      if (attempts > maxRetries) {
        console.error(`[SealedSignaling] Failed to emit signal after ${attempts} attempts:`, error);
        throw error;
      }
      console.warn(`[SealedSignaling] Emit attempt ${attempts} failed, retrying...`, error);
      await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
    }
  }
}

/** Resolve offer/answer/candidate from relay payload (sealed preferred, legacy fallback). */
export async function resolveWebRtcRelayPayload(
  crypto: CommsCallCryptoSession | null,
  data: CyrusWebRtcRelayPayload,
  maxRetries = 2,
): Promise<CyrusWebRtcSignalBody | null> {
  // Try sealed payload first if enabled and available
  if (data.sealed && isSealedPayload(data.sealed) && isCommsSealedSignalingEnabled()) {
    if (!crypto?.isReady) {
      // Peer may still be handshaking — fall through to legacy fields if present
      if (!data.offer && !data.answer && data.candidate === undefined) {
        console.log("[SealedSignaling] Crypto not ready and no legacy fields, waiting...");
        return null;
      }
    } else {
      // Attempt to decrypt with retry
      let attempts = 0;
      while (attempts < maxRetries) {
        try {
          const result = await crypto.open(data.sealed);
          console.log("[SealedSignaling] Successfully decrypted sealed payload");
          return result;
        } catch (e) {
          attempts++;
          if (attempts >= maxRetries) {
            console.warn(
              `[SealedSignaling] Failed to open sealed payload after ${attempts} attempts, falling back to legacy:`,
              e,
            );
          } else {
            console.log(`[SealedSignaling] Decrypt attempt ${attempts} failed, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
          }
        }
      }
    }
  }

  // Fallback to legacy plaintext fields
  if (data.offer) {
    console.log("[SealedSignaling] Using legacy plaintext offer");
    return { kind: "offer", offer: data.offer };
  }
  if (data.answer) {
    console.log("[SealedSignaling] Using legacy plaintext answer");
    return { kind: "answer", answer: data.answer };
  }
  if (data.candidate !== undefined) {
    console.log("[SealedSignaling] Using legacy plaintext ICE candidate");
    return { kind: "ice-candidate", candidate: data.candidate as RTCIceCandidateInit };
  }

  console.warn("[SealedSignaling] No valid payload found in relay data");
  return null;
}
