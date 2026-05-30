/**
 * Star-topology group call — each joiner connects only to host (O(n) vs O(n²) mesh).
 * Uses existing webrtc-* socket relay with targetPeerId.
 */
import type { Socket } from "socket.io-client";
import { fetchCyrusCommRtcConfiguration } from "./fetch-rtc-config";
import {
  SDP_NEGOTIATION_OPTIONS,
  applyCommsSenderTuning,
  applyPreferredCodecsToPeerConnection,
  resetOutboundBitrateTracker,
} from "../lib/webrtc-config";
import { acquireCommsUserMedia, tuneCommsPeerConnection } from "../lib/comms-call-media";
import { addIceCandidateSafe } from "./webrtc-ice-utils";
import type { AdaptiveBitrateController } from "../lib/webrtc-config";

type PeerConn = {
  pc: RTCPeerConnection;
  abr: AdaptiveBitrateController | null;
  pendingIce: RTCIceCandidateInit[];
};

export class CyrusStarGroupCall {
  private readonly peers = new Map<string, PeerConn>();
  private readonly remoteStreams = new Map<string, MediaStream>();
  private localStream: MediaStream | null = null;
  private disposeMediaPipeline: (() => void) | null = null;
  private disposed = false;
  private bound = false;

  constructor(
    private readonly socket: Socket,
    private readonly roomId: string,
    private readonly selfId: string,
    private readonly hostPeerId: string,
    private readonly isHost: boolean,
    private readonly callType: "audio" | "video",
    private readonly onRemoteStream: (peerId: string, stream: MediaStream) => void,
    private readonly onPeerLeft: (peerId: string) => void,
  ) {}

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStreams() {
    return this.remoteStreams;
  }

  async start(existingPeerIds: string[] = []): Promise<void> {
    const acquired = await acquireCommsUserMedia(this.callType);
    this.localStream = acquired.stream;
    this.disposeMediaPipeline = acquired.disposeMediaPipeline;
    this.bindSocketHandlers();

    if (this.isHost) {
      for (const peerId of existingPeerIds) {
        if (peerId === this.selfId) continue;
        await this.connectAsOfferer(peerId);
      }
    }
  }

  async onPeerJoined(peerId: string) {
    if (this.disposed || !this.isHost || peerId === this.selfId) return;
    await this.connectAsOfferer(peerId);
  }

  private bindSocketHandlers() {
    if (this.bound) return;
    this.bound = true;

    this.socket.on("webrtc-offer", this.handleOffer);
    this.socket.on("webrtc-answer", this.handleAnswer);
    this.socket.on("webrtc-ice-candidate", this.handleIce);
    this.socket.on("peer-left", this.handlePeerLeft);
  }

  private unbindSocketHandlers() {
    if (!this.bound) return;
    this.socket.off("webrtc-offer", this.handleOffer);
    this.socket.off("webrtc-answer", this.handleAnswer);
    this.socket.off("webrtc-ice-candidate", this.handleIce);
    this.socket.off("peer-left", this.handlePeerLeft);
    this.bound = false;
  }

  private handleOffer = async (data: {
    roomId: string;
    fromPeerId: string;
    offer: RTCSessionDescriptionInit;
  }) => {
    if (this.disposed || data.roomId !== this.roomId) return;
    if (this.isHost) return;
    if (data.fromPeerId !== this.hostPeerId) return;

    const pc = await this.ensurePeer(this.hostPeerId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    await this.flushIce(this.hostPeerId);
    const answer = await pc.createAnswer(SDP_NEGOTIATION_OPTIONS.answer);
    await pc.setLocalDescription(answer);
    this.socket.emit("webrtc-answer", {
      roomId: this.roomId,
      answer,
      targetPeerId: this.hostPeerId,
    });
  };

  private handleAnswer = async (data: {
    roomId: string;
    fromPeerId: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    if (this.disposed || data.roomId !== this.roomId || !this.isHost) return;
    const entry = this.peers.get(data.fromPeerId);
    if (!entry) return;
    await entry.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    await this.flushIce(data.fromPeerId);
  };

  private handleIce = async (data: {
    roomId: string;
    fromPeerId: string;
    candidate: unknown;
  }) => {
    if (this.disposed || data.roomId !== this.roomId) return;
    const entry = this.peers.get(data.fromPeerId);
    if (!entry) return;
    if (entry.pc.remoteDescription) {
      await addIceCandidateSafe(entry.pc, data.candidate);
    } else {
      const init = data.candidate as RTCIceCandidateInit;
      entry.pendingIce.push(init);
    }
  };

  private handlePeerLeft = (data: { roomId: string; peerId: string }) => {
    if (data.roomId !== this.roomId) return;
    this.closePeer(data.peerId);
    this.onPeerLeft(data.peerId);
  };

  private async ensurePeer(peerId: string): Promise<RTCPeerConnection> {
    let entry = this.peers.get(peerId);
    if (entry) return entry.pc;

    const rtcConfig = await fetchCyrusCommRtcConfiguration();
    const pc = new RTCPeerConnection(rtcConfig);
    resetOutboundBitrateTracker(pc);
    applyPreferredCodecsToPeerConnection(pc);
    await applyCommsSenderTuning(pc, this.callType);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.ontrack = (ev) => {
      let ms = this.remoteStreams.get(peerId);
      if (!ms) {
        ms = new MediaStream();
        this.remoteStreams.set(peerId, ms);
      }
      if (!ms.getTracks().some((t) => t.id === ev.track.id)) {
        ms.addTrack(ev.track);
      }
      this.onRemoteStream(peerId, ms);
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      const plain =
        typeof ev.candidate.toJSON === "function" ? ev.candidate.toJSON() : ev.candidate;
      this.socket.emit("webrtc-ice-candidate", {
        roomId: this.roomId,
        candidate: plain,
        targetPeerId: peerId,
      });
    };

    const abr = await tuneCommsPeerConnection(pc, this.callType);
    abr.start();
    entry = { pc, abr, pendingIce: [] };
    this.peers.set(peerId, entry);
    return pc;
  }

  private async connectAsOfferer(peerId: string) {
    const pc = await this.ensurePeer(peerId);
    const offer = await pc.createOffer(SDP_NEGOTIATION_OPTIONS.offer);
    await pc.setLocalDescription(offer);
    this.socket.emit("webrtc-offer", {
      roomId: this.roomId,
      offer,
      targetPeerId: peerId,
    });
  }

  private async flushIce(peerId: string) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    const q = [...entry.pendingIce];
    entry.pendingIce = [];
    for (const c of q) {
      await addIceCandidateSafe(entry.pc, c);
    }
  }

  private closePeer(peerId: string) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    entry.abr?.stop();
    entry.pc.close();
    this.peers.delete(peerId);
    this.remoteStreams.delete(peerId);
  }

  stop() {
    if (this.disposed) return;
    this.disposed = true;
    this.unbindSocketHandlers();
    for (const peerId of [...this.peers.keys()]) {
      this.closePeer(peerId);
    }
    this.disposeMediaPipeline?.();
    this.disposeMediaPipeline = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }
}
