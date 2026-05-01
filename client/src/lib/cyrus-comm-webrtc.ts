/** WebRTC helpers for CYRUS Comm P2P tab (SDP offer/answer + trickle ICE). */

const DEFAULT_ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function createCyrusCommPeerConnection(
  iceServers: RTCIceServer[],
  handlers: {
    onLocalCandidate: (c: RTCIceCandidate) => void;
    onRemoteTrack: (ev: RTCTrackEvent) => void;
    onConnectionState?: (state: RTCPeerConnectionState) => void;
  },
) {
  const servers = iceServers?.length ? iceServers : DEFAULT_ICE;
  const pc = new RTCPeerConnection({
    iceServers: servers,
    iceCandidatePoolSize: 10,
  });

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
      console.warn("[CyrusComm] ICE failed — restartIce");
      try {
        pc.restartIce();
      } catch (e) {
        console.error("[CyrusComm] restartIce", e);
      }
    }
  };

  return pc;
}

export async function getCyrusCommUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
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

export function closeCyrusCommPeer(pc: RTCPeerConnection | null) {
  if (!pc) return;
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
    pc.close();
  } catch (e) {
    console.warn("[CyrusComm] closePeer", e);
  }
}
