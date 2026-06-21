/**
 * mediasoup-client SFU session for CYRUS group / conference rooms.
 */
import { Device } from "mediasoup-client";
import type { Socket } from "socket.io-client";
import type { CyrusSfuMode } from "@shared/comms/sfu-types";
import { acquireCommsUserMedia } from "../lib/comms-call-media";
import { applyPreferredCodecsToPeerConnection } from "../lib/webrtc-config";

export type SfuRemoteTrack = {
  peerId: string;
  kind: "audio" | "video";
  track: MediaStreamTrack;
  stream: MediaStream;
};


type DtlsConnectParams = { dtlsParameters: Record<string, unknown> };
type ProduceParams = { kind: "audio" | "video"; rtpParameters: Record<string, unknown> };

function socketAck<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res: T & { ok?: boolean; error?: string }) => {
      if (res && typeof res === "object" && "ok" in res && res.ok === false) {
        reject(new Error(res.error || `${event} failed`));
        return;
      }
      resolve(res);
    });
  });
}

type MediasoupSendTransport = ReturnType<Device["createSendTransport"]>;
type MediasoupRecvTransport = ReturnType<Device["createRecvTransport"]>;

export class CyrusSfuClient {
  private device: Device | null = null;
  private sendTransport: MediasoupSendTransport | null = null;
  private recvTransport: MediasoupRecvTransport | null = null;
  private localStream: MediaStream | null = null;
  private disposeMediaPipeline: (() => void) | null = null;
  private readonly remoteByPeer = new Map<string, MediaStream>();
  private disposed = false;

  constructor(
    private readonly socket: Socket,
    private readonly roomId: string,
    private readonly displayName: string,
    private readonly callType: "audio" | "video",
    private readonly onRemote: (remote: SfuRemoteTrack) => void,
    private readonly preAcquired?: {
      stream: MediaStream;
      disposeMediaPipeline: () => void;
    } | null,
  ) {}

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStreams(): Map<string, MediaStream> {
    return this.remoteByPeer;
  }

  async start(): Promise<CyrusSfuMode> {
    const join = await socketAck<{
      ok: boolean;
      sfuMode?: CyrusSfuMode;
      mode?: "mediasoup" | "star";
      rtpCapabilities?: unknown;
    }>(this.socket, "sfu-join", { roomId: this.roomId, displayName: this.displayName });

    if (join.mode !== "mediasoup" || !join.rtpCapabilities) {
      return "star";
    }

    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: join.rtpCapabilities as never });

    if (this.preAcquired?.stream.getTracks().some((t) => t.readyState === "live")) {
      this.localStream = this.preAcquired.stream;
      this.disposeMediaPipeline = this.preAcquired.disposeMediaPipeline;
    } else {
      const acquired = await acquireCommsUserMedia(this.callType);
      this.localStream = acquired.stream;
      this.disposeMediaPipeline = acquired.disposeMediaPipeline;
    }

    await this.createSendTransport();
    await this.createRecvTransport();
    await this.publishLocalTracks();
    await this.consumeExistingProducers();

    this.socket.on("sfu-new-producer", this.onNewProducer);
    return "mediasoup";
  }

  private onNewProducer = (payload: {
    roomId: string;
    producerId: string;
    peerId: string;
    kind: "audio" | "video";
  }) => {
    if (payload.roomId !== this.roomId || this.disposed) return;
    void this.consumeProducer(payload.producerId, payload.peerId, payload.kind);
  };

  private async createSendTransport() {
    if (!this.device) throw new Error("SFU device not loaded");
    const res = await socketAck<{ ok: boolean; transport: { id: string; iceParameters: unknown; iceCandidates: unknown; dtlsParameters: unknown } }>(
      this.socket,
      "sfu-create-transport",
      { roomId: this.roomId, direction: "send" },
    );

    this.sendTransport = this.device.createSendTransport(res.transport as never);
    this.sendTransport.on(
      "connect",
      (
        { dtlsParameters }: DtlsConnectParams,
        callback: () => void,
        errback: (error: Error) => void,
      ) => {
      void socketAck(this.socket, "sfu-connect-transport", {
        roomId: this.roomId,
        direction: "send",
        dtlsParameters,
      })
        .then(() => callback())
        .catch((e) => errback(e instanceof Error ? e : new Error(String(e))));
    },
    );
    this.sendTransport.on(
      "produce",
      (
        { kind, rtpParameters }: ProduceParams,
        callback: (params: { id: string }) => void,
        errback: (error: Error) => void,
      ) => {
      void socketAck<{ ok: boolean; producerId: string }>(this.socket, "sfu-produce", {
        roomId: this.roomId,
        kind,
        rtpParameters,
      })
        .then((r) => callback({ id: r.producerId }))
        .catch((e) => errback(e instanceof Error ? e : new Error(String(e))));
    },
    );
  }

  private async createRecvTransport() {
    if (!this.device) throw new Error("SFU device not loaded");
    const res = await socketAck<{ ok: boolean; transport: { id: string; iceParameters: unknown; iceCandidates: unknown; dtlsParameters: unknown } }>(
      this.socket,
      "sfu-create-transport",
      { roomId: this.roomId, direction: "recv" },
    );

    this.recvTransport = this.device.createRecvTransport(res.transport as never);
    this.recvTransport.on(
      "connect",
      (
        { dtlsParameters }: DtlsConnectParams,
        callback: () => void,
        errback: (error: Error) => void,
      ) => {
      void socketAck(this.socket, "sfu-connect-transport", {
        roomId: this.roomId,
        direction: "recv",
        dtlsParameters,
      })
        .then(() => callback())
        .catch((e) => errback(e instanceof Error ? e : new Error(String(e))));
    },
    );
  }

  private async publishLocalTracks() {
    if (!this.sendTransport || !this.localStream) return;
    for (const track of this.localStream.getTracks()) {
      if (this.callType === "audio" && track.kind === "video") continue;
      if (track.kind === "video") {
        await this.sendTransport.produce({
          track,
          encodings: [
            { rid: "h", scaleResolutionDownBy: 1, maxBitrate: 1_500_000 },
            { rid: "m", scaleResolutionDownBy: 2, maxBitrate: 600_000 },
            { rid: "l", scaleResolutionDownBy: 4, maxBitrate: 200_000 },
          ],
          codecOptions: { videoGoogleStartBitrate: 1000 },
        });
      } else {
        await this.sendTransport.produce({ track });
      }
    }
  }

  private async consumeExistingProducers() {
    const res = await socketAck<{
      ok: boolean;
      producers: { producerId: string; peerId: string; kind: "audio" | "video" }[];
    }>(this.socket, "sfu-get-producers", { roomId: this.roomId });
    for (const p of res.producers ?? []) {
      await this.consumeProducer(p.producerId, p.peerId, p.kind);
    }
  }

  private async consumeProducer(producerId: string, peerId: string, kind: "audio" | "video") {
    if (!this.device || !this.recvTransport || this.disposed) return;
    const res = await socketAck<{
      ok: boolean;
      consumer: {
        consumerId: string;
        producerPeerId?: string;
        kind: "audio" | "video";
        rtpParameters: unknown;
      };
    }>(this.socket, "sfu-consume", {
      roomId: this.roomId,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    const consumer = await this.recvTransport.consume({
      id: res.consumer.consumerId,
      producerId,
      kind: res.consumer.kind,
      rtpParameters: res.consumer.rtpParameters as never,
    });
    await socketAck(this.socket, "sfu-resume-consumer", {
      roomId: this.roomId,
      consumerId: consumer.id,
    });

    const track = consumer.track;
    let stream = this.remoteByPeer.get(peerId);
    if (!stream) {
      stream = new MediaStream();
      this.remoteByPeer.set(peerId, stream);
    }
    if (!stream.getTracks().some((t) => t.id === track.id)) {
      stream.addTrack(track);
    }
    this.onRemote({ peerId, kind, track, stream });
  }

  stop() {
    if (this.disposed) return;
    this.disposed = true;
    this.socket.off("sfu-new-producer", this.onNewProducer);
    this.socket.emit("sfu-leave", { roomId: this.roomId });
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.disposeMediaPipeline?.();
    this.disposeMediaPipeline = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }
}

/** No-op helper for star path PCs */
export function tuneStarPeerConnection(pc: RTCPeerConnection): void {
  applyPreferredCodecsToPeerConnection(pc);
}
