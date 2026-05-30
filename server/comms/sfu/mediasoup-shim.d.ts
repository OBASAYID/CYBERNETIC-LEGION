/** Minimal mediasoup types when optional native package is not installed locally. */
declare module "mediasoup" {
  export namespace types {
    export type Worker = {
      on(event: string, cb: () => void): void;
      createRouter(options: unknown): Promise<Router>;
    };
    export type Router = {
      rtpCapabilities: RtpCapabilities;
      canConsume(input: { producerId: string; rtpCapabilities: RtpCapabilities }): boolean;
      createWebRtcTransport(options: unknown): Promise<WebRtcTransport>;
      close(): void;
    };
    export type WebRtcTransport = {
      id: string;
      iceParameters: unknown;
      iceCandidates: unknown;
      dtlsParameters: unknown;
      connect(input: { dtlsParameters: DtlsParameters }): Promise<void>;
      produce(input: { kind: MediaKind; rtpParameters: RtpParameters }): Promise<Producer>;
      consume(input: {
        producerId: string;
        rtpCapabilities: RtpCapabilities;
        paused: boolean;
      }): Promise<Consumer>;
      close(): void;
    };
    export type Producer = { id: string; kind: MediaKind };
    export type Consumer = {
      id: string;
      kind: MediaKind;
      rtpParameters: RtpParameters;
      resume(): Promise<void>;
    };
    export type MediaKind = "audio" | "video";
    export type RtpCapabilities = unknown;
    export type RtpParameters = unknown;
    export type DtlsParameters = unknown;
  }
  export function createWorker(options: unknown): Promise<types.Worker>;
}
