/**
 * CYRUS RTC architecture seams — P2P today, SFU (LiveKit / mediasoup / Janus) tomorrow.
 * Keep signaling, peer lifecycle, and media policy behind narrow interfaces.
 */

import type { Socket } from "socket.io-client";

/** Signaling surface used by CYRUS Comms (Socket.IO today). */
export interface CyrusSignalingTransport {
  emit(event: string, payload: unknown): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  get connected(): boolean;
}

/** Factory for RTCPeerConnection (inject SFU client later). */
export interface CyrusPeerConnectionFactory {
  create(configuration: RTCConfiguration): RTCPeerConnection;
}

export class DefaultPeerConnectionFactory implements CyrusPeerConnectionFactory {
  create(configuration: RTCConfiguration): RTCPeerConnection {
    return new RTCPeerConnection(configuration);
  }
}

/** Wraps Socket.IO as CyrusSignalingTransport. */
export function signalingFromSocket(socket: Socket): CyrusSignalingTransport {
  return {
    emit: (e, p) => socket.emit(e, p as never),
    on: (e, h) => socket.on(e, h as never),
    off: (e, h) => socket.off(e, h as never),
    get connected() {
      return socket.connected;
    },
  };
}

/**
 * Media policy hooks (bandwidth caps, simulcast prep) — no-op for mesh P2P.
 * SFU implementation can enforce publisher caps here.
 */
export interface CyrusMediaPolicy {
  maxPublishBitrateKbps?: number;
  maxSimulcastLayers?: number;
  throttleScreenshareFramerate?: number;
}

export const DEFAULT_MEDIA_POLICY: CyrusMediaPolicy = {
  maxPublishBitrateKbps: 4_000,
  maxSimulcastLayers: 3,
  throttleScreenshareFramerate: 15,
};
