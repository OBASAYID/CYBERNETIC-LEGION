/** WebRTC helpers for CYRUS Comm mesh layer — shares Presence call quality stack. */

import {
  applyPreferredCodecsToPeerConnection,
  resetOutboundBitrateTracker,
  SDP_NEGOTIATION_OPTIONS,
} from "./webrtc-config";
import { acquireCommsUserMedia, tuneCommsPeerConnection } from "./comms-call-media";
import { fetchCyrusCommRtcConfiguration } from "../realtime/fetch-rtc-config";
import type { AdaptiveBitrateController } from "./webrtc-config";

const DEFAULT_ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type CyrusCommPeer = {
  pc: RTCPeerConnection;
  abr: AdaptiveBitrateController | null;
  audioProcessor: import("./webrtc-config").AudioProcessor | null;
};

export async function createCyrusCommPeerConnection(
  handlers: {
    onLocalCandidate: (c: RTCIceCandidate) => void;
    onRemoteTrack: (ev: RTCTrackEvent) => void;
    onConnectionState?: (state: RTCPeerConnectionState) => void;
    onIceState?: (state: RTCIceConnectionState) => void;
  },
  options?: { callType?: "audio" | "video"; forceRelay?: boolean },
): Promise<CyrusCommPeer> {
  const rtcConfig = await fetchCyrusCommRtcConfiguration({ forceRelay: options?.forceRelay });
  const pc = new RTCPeerConnection(rtcConfig);
  resetOutboundBitrateTracker(pc);

  let restartAttempted = false;

  pc.onicecandidate = (ev) => {
    if (ev.candidate) handlers.onLocalCandidate(ev.candidate);
  };

  pc.ontrack = (ev) => handlers.onRemoteTrack(ev);

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    handlers.onConnectionState?.(state);
    if (state === "failed" && !restartAttempted) {
      restartAttempted = true;
      try {
        pc.restartIce();
      } catch (e) {
        console.error("[CyrusComm] restartIce", e);
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    handlers.onIceState?.(pc.iceConnectionState);
    if (pc.iceConnectionState === "failed" && !restartAttempted) {
      restartAttempted = true;
      try {
        pc.restartIce();
      } catch (e) {
        console.error("[CyrusComm] restartIce (ice)", e);
      }
    }
  };

  applyPreferredCodecsToPeerConnection(pc);
  const callType = options?.callType ?? "video";
  const abr = await tuneCommsPeerConnection(pc, callType);

  return { pc, abr, audioProcessor: null };
}

export async function getCyrusCommUserMedia(
  callType: "audio" | "video",
): Promise<import("./comms-call-media").CommsAcquiredMedia | null> {
  try {
    const acquired = await acquireCommsUserMedia(callType);
    return acquired;
  } catch (e) {
    console.error("[CyrusComm] getUserMedia", e);
    return null;
  }
}

export function attachLocalTracks(pc: RTCPeerConnection, stream: MediaStream) {
  for (const t of stream.getTracks()) {
    pc.addTrack(t, stream);
  }
}

export function closeCyrusCommPeer(peer: CyrusCommPeer | RTCPeerConnection | null) {
  if (!peer) return;
  const pc = "pc" in peer ? peer.pc : peer;
  const abr = "abr" in peer ? peer.abr : null;
  const audioProcessor = "audioProcessor" in peer ? peer.audioProcessor : null;

  abr?.stop();
  audioProcessor?.destroy();
  resetOutboundBitrateTracker(pc);

  try {
    for (const s of pc.getSenders()) {
      try {
        s.track?.stop();
      } catch {
        /* ignore */
      }
    }
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.close();
  } catch (e) {
    console.warn("[CyrusComm] closePeer", e);
  }
}

export { SDP_NEGOTIATION_OPTIONS, DEFAULT_ICE };
