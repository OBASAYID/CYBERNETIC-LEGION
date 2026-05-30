/**
 * WebRTC helpers: peer connection, getUserMedia, ICE restart on failure.
 */

const DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

/**
 * @param {RTCIceServer[]} iceServers
 * @param {object} handlers
 * @param {(c: RTCIceCandidate) => void} handlers.onLocalCandidate
 * @param {(e: RTCTrackEvent) => void} handlers.onRemoteTrack
 * @param {(state: RTCPeerConnectionState) => void} [handlers.onConnectionState]
 */
export function createPeerConnection(iceServers, handlers) {
  const servers = iceServers?.length ? iceServers : DEFAULT_ICE;
  const pc = new RTCPeerConnection({
    iceServers: servers,
    iceCandidatePoolSize: 10,
  });

  let restartAttempted = false;

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      handlers.onLocalCandidate(ev.candidate);
    }
  };

  pc.ontrack = (ev) => {
    handlers.onRemoteTrack(ev);
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    handlers.onConnectionState?.(state);
    if (state === "failed" && !restartAttempted) {
      restartAttempted = true;
      console.warn("[webrtc] connection failed — attempting ICE restart");
      try {
        pc.restartIce();
      } catch (e) {
        console.error("[webrtc] restartIce error", e);
      }
    }
  };

  return pc;
}

/**
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise<MediaStream | null>}
 */
export async function getUserMediaSafe(constraints) {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (e) {
    console.error("[webrtc] getUserMedia failed", e);
    return null;
  }
}

/**
 * @param {RTCPeerConnection} pc
 * @param {MediaStream} stream
 */
export function attachLocalTracks(pc, stream) {
  for (const t of stream.getTracks()) {
    pc.addTrack(t, stream);
  }
}

/**
 * @param {RTCPeerConnection} pc
 */
export function detachAndStopMedia(pc) {
  for (const sender of pc.getSenders()) {
    try {
      sender.track?.stop();
    } catch (_) {
      /* ignore */
    }
  }
}

/**
 * @param {RTCPeerConnection | null} pc
 */
export function closePeerConnection(pc) {
  if (!pc) return;
  try {
    detachAndStopMedia(pc);
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
  } catch (e) {
    console.warn("[webrtc] closePeerConnection", e);
  }
}
