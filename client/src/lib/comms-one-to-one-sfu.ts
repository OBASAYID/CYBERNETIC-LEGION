/**
 * 1:1 video calls via mediasoup SFU — same engine as group calls, more reliable than P2P WAN.
 */
import type { Socket } from "socket.io-client";
import type { CyrusSfuMode } from "@shared/comms/sfu-types";
import { systemFetch } from "@shared/cyrus-api-client";
import type { CommsAcquiredMedia } from "./comms-call-media";
import { CyrusSfuClient } from "../realtime/cyrus-sfu-client";

let cachedVideoUsesSfu: boolean | null = null;

/** Mirrors server resolveOneToOneCallMediaMode for callee-side setup before accept ack. */
export async function resolveClientOneToOneMediaMode(
  callType: "audio" | "video",
): Promise<"p2p" | "mediasoup"> {
  if (callType !== "video") return "p2p";
  if (cachedVideoUsesSfu !== null) return cachedVideoUsesSfu ? "mediasoup" : "p2p";
  try {
    const res = await systemFetch("/api/comms/sfu/status", { cache: "no-store" });
    if (!res.ok) {
      cachedVideoUsesSfu = false;
      return "p2p";
    }
    const body = (await res.json()) as { mode?: CyrusSfuMode; mediasoupAvailable?: boolean };
    cachedVideoUsesSfu = body.mode === "mediasoup" && body.mediasoupAvailable !== false;
  } catch {
    cachedVideoUsesSfu = false;
  }
  return cachedVideoUsesSfu ? "mediasoup" : "p2p";
}

export function parseSignaledMediaMode(
  callType: "audio" | "video",
  sfuMode?: string | null,
): "p2p" | "mediasoup" {
  if (callType !== "video") return "p2p";
  return sfuMode === "mediasoup" ? "mediasoup" : "p2p";
}

export type OneToOneSfuSession = {
  localStream: MediaStream;
  stop: () => void;
};

export async function startOneToOneSfuSession(opts: {
  socket: Socket;
  roomId: string;
  displayName: string;
  callType: "audio" | "video";
  selfId: string;
  onRemoteStream: (stream: MediaStream) => void;
  preAcquired?: CommsAcquiredMedia | null;
}): Promise<OneToOneSfuSession | null> {
  const client = new CyrusSfuClient(
    opts.socket,
    opts.roomId,
    opts.displayName,
    opts.callType,
    ({ peerId, stream }) => {
      if (peerId !== opts.selfId) {
        opts.onRemoteStream(stream);
      }
    },
    opts.preAcquired
      ? {
          stream: opts.preAcquired.stream,
          disposeMediaPipeline: opts.preAcquired.disposeMediaPipeline,
        }
      : null,
  );

  const mode = await client.start();
  if (mode !== "mediasoup") {
    client.stop();
    return null;
  }

  const localStream = client.getLocalStream();
  if (!localStream) {
    client.stop();
    return null;
  }

  for (const [, stream] of client.getRemoteStreams()) {
    opts.onRemoteStream(stream);
  }

  return {
    localStream,
    stop: () => client.stop(),
  };
}
