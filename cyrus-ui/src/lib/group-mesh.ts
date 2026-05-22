/**
 * Full-mesh WebRTC for small groups (≤10) over CYRUS /ws signaling.
 * Lexicographic userId ordering: lower id is SDP offerer for each pair (glare avoidance).
 */

import { systemFetch } from "@/lib/system-api";

export const GROUP_CALL_MAX_MEMBERS = 10;

const EMBEDDED_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

function mergeIce(a: RTCIceServer[], b: RTCIceServer[]): RTCIceServer[] {
  const seen = new Set<string>();
  const out: RTCIceServer[] = [];
  for (const list of [a, b]) {
    for (const s of list) {
      const key = JSON.stringify(s.urls) + String(s.username ?? "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

function normalizeIceCandidateInit(raw: unknown): RTCIceCandidateInit | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candVal = o.candidate;
  if (candVal !== null && typeof candVal !== "string") return null;
  const c = candVal as string | undefined | null;
  if (c == null || c === "" || !c.startsWith("candidate:")) return null;
  const init: RTCIceCandidateInit = { candidate: c };
  if (typeof o.sdpMid === "string" || o.sdpMid === null) init.sdpMid = o.sdpMid as string | null;
  if (typeof o.sdpMLineIndex === "number") init.sdpMLineIndex = o.sdpMLineIndex;
  return init;
}

async function addIceLoose(pc: RTCPeerConnection, raw: unknown): Promise<void> {
  const init = normalizeIceCandidateInit(raw);
  if (!init) return;
  try {
    await pc.addIceCandidate(init);
  } catch {
    /* ignore */
  }
}

export type GroupInvitePayload = {
  roomId: string;
  callType: "voice" | "video";
  memberIds: string[];
  hostName: string;
};

type PeerState = {
  pc: RTCPeerConnection;
  icePending: RTCIceCandidateInit[];
};

export class GroupMeshSession {
  readonly roomId: string;
  private readonly selfId: string;
  private readonly memberIds: string[];
  private readonly callType: "voice" | "video";
  private readonly linkProfile: "terrestrial" | "satellite";
  private readonly sendJson: (msg: Record<string, unknown>) => void;
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, PeerState>();
  private readonly remoteStreams = new Map<string, MediaStream>();
  private disposed = false;
  private onRemote?: (peerId: string, stream: MediaStream) => void;
  private onEnd?: () => void;

  constructor(
    roomId: string,
    selfId: string,
    memberIds: string[],
    callType: "voice" | "video",
    linkProfile: "terrestrial" | "satellite",
    sendJson: (msg: Record<string, unknown>) => void,
  ) {
    this.roomId = roomId;
    this.selfId = selfId;
    this.memberIds = [...new Set(memberIds)].sort();
    this.callType = callType;
    this.linkProfile = linkProfile;
    this.sendJson = sendJson;
  }

  getRemoteStreams(): ReadonlyMap<string, MediaStream> {
    return this.remoteStreams;
  }

  isActive(): boolean {
    return !this.disposed;
  }

  setCallbacks(cb: { onRemoteStream?: (peerId: string, stream: MediaStream) => void; onEnded?: () => void }) {
    this.onRemote = cb.onRemoteStream;
    this.onEnd = cb.onEnded;
  }

  /**
   * Host should use a longer delay so invitees can accept and join the signaling room first.
   */
  async startWithLocalStream(stream: MediaStream, opts?: { offerDelayMs?: number }) {
    this.localStream = stream;
    this.sendJson({ type: "join", roomId: this.roomId });

    const iceServers = await this.loadIce();
    const delay = opts?.offerDelayMs ?? 250;
    await new Promise((r) => setTimeout(r, delay));

    const others = this.memberIds.filter((id) => id !== this.selfId);
    for (const otherId of others) {
      if (this.selfId < otherId) {
        await this.connectAsOfferer(otherId, iceServers);
      }
    }
  }

  private async loadIce(): Promise<RTCIceServer[]> {
    const url =
      this.linkProfile === "satellite"
        ? "/api/cyrus-comm/config/webrtc?link=satellite"
        : "/api/cyrus-comm/config/webrtc";
    try {
      const res = await systemFetch(url);
      if (!res.ok) return EMBEDDED_ICE;
      const j = (await res.json()) as { iceServers?: RTCIceServer[] };
      if (Array.isArray(j.iceServers) && j.iceServers.length) return mergeIce(j.iceServers as RTCIceServer[], EMBEDDED_ICE);
    } catch {
      /* ignore */
    }
    return EMBEDDED_ICE;
  }

  private createPc(iceServers: RTCIceServer[]): RTCPeerConnection {
    return new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 8,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });
  }

  private attachRemote(pc: RTCPeerConnection, peerId: string) {
    pc.ontrack = (ev) => {
      let ms = this.remoteStreams.get(peerId);
      if (!ms) {
        ms = new MediaStream();
        this.remoteStreams.set(peerId, ms);
      }
      ms.addTrack(ev.track);
      this.onRemote?.(peerId, ms);
    };
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || this.disposed) return;
      const payload =
        typeof ev.candidate.toJSON === "function" ? ev.candidate.toJSON() : ev.candidate;
      this.sendJson({
        type: "group-ice-candidate",
        roomId: this.roomId,
        targetUserId: peerId,
        from: this.selfId,
        data: payload,
      });
    };
  }

  private async connectAsOfferer(peerId: string, iceServers: RTCIceServer[]) {
    if (this.disposed || !this.localStream) return;
    const pc = this.createPc(iceServers);
    this.peers.set(peerId, { pc, icePending: [] });
    this.attachRemote(pc, peerId);
    this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.callType === "video",
    });
    await pc.setLocalDescription(offer);
    this.sendJson({
      type: "group-offer",
      roomId: this.roomId,
      targetUserId: peerId,
      from: this.selfId,
      data: offer,
    });
  }

  async handleSignal(msg: Record<string, unknown>): Promise<void> {
    if (this.disposed) return;
    const from = msg.from as string;
    const targetUserId = msg.targetUserId as string | undefined;
    const roomId = msg.roomId as string | undefined;
    if (roomId && roomId !== this.roomId) return;

    switch (msg.type) {
      case "group-offer": {
        if (targetUserId !== this.selfId || !from || from === this.selfId) return;
        const iceServers = await this.loadIce();
        let st = this.peers.get(from);
        if (!st) {
          const pc = this.createPc(iceServers);
          st = { pc, icePending: [] };
          this.peers.set(from, st);
          this.attachRemote(st.pc, from);
          if (this.localStream) {
            this.localStream.getTracks().forEach((t) => st!.pc.addTrack(t, this.localStream!));
          }
        }
        const { pc, icePending } = st;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit));
        for (const c of [...icePending]) await addIceLoose(pc, c);
        icePending.length = 0;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendJson({
          type: "group-answer",
          roomId: this.roomId,
          targetUserId: from,
          from: this.selfId,
          data: answer,
        });
        break;
      }
      case "group-answer": {
        if (targetUserId !== this.selfId || !from) return;
        const st = this.peers.get(from);
        if (!st?.pc) return;
        await st.pc.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit));
        for (const c of [...st.icePending]) await addIceLoose(st.pc, c);
        st.icePending.length = 0;
        break;
      }
      case "group-ice-candidate": {
        if (targetUserId !== this.selfId || !from) return;
        const st = this.peers.get(from);
        const init = normalizeIceCandidateInit(msg.data);
        if (!init || !st) return;
        if (!st.pc.remoteDescription) {
          st.icePending.push(init);
          return;
        }
        await addIceLoose(st.pc, init);
        break;
      }
      default:
        break;
    }
  }

  dispose(sendEnd: boolean) {
    if (this.disposed) return;
    this.disposed = true;
    if (sendEnd) {
      this.sendJson({ type: "group-end", roomId: this.roomId, from: this.selfId });
    }
    for (const { pc } of this.peers.values()) {
      try {
        pc.close();
      } catch {
        /* ignore */
      }
    }
    this.peers.clear();
    this.remoteStreams.clear();
    this.onEnd?.();
  }
}
