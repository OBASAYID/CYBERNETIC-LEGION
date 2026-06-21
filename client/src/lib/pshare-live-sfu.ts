import type { Socket } from "socket.io-client";
import type { CyrusSfuMode } from "@shared/comms/sfu-types";
import { CyrusSfuClient } from "../realtime/cyrus-sfu-client";

export function pshareLiveSfuRoomId(streamId: string): string {
  return `pshare-live-${streamId}`;
}

export async function startPshareLiveSfuBroadcast(opts: {
  socket: Socket;
  streamId: string;
  displayName: string;
  localStream: MediaStream;
}): Promise<{ stop: () => void; mode: CyrusSfuMode } | null> {
  const client = new CyrusSfuClient(
    opts.socket,
    pshareLiveSfuRoomId(opts.streamId),
    opts.displayName,
    "video",
    () => {},
    { stream: opts.localStream, disposeMediaPipeline: () => {} },
    false,
    true,
  );

  const mode = await client.start();
  if (mode !== "mediasoup") {
    client.stop();
    return null;
  }

  return {
    mode,
    stop: () => client.stop(),
  };
}

export async function startPshareLiveSfuViewer(opts: {
  socket: Socket;
  streamId: string;
  displayName: string;
  onRemoteStream: (stream: MediaStream) => void;
}): Promise<{ stop: () => void } | null> {
  const client = new CyrusSfuClient(
    opts.socket,
    pshareLiveSfuRoomId(opts.streamId),
    opts.displayName,
    "video",
    ({ kind, stream }) => {
      if (kind === "video" && stream.getVideoTracks().some((t) => t.readyState === "live")) {
        opts.onRemoteStream(stream);
      }
    },
    null,
    true,
  );

  const mode = await client.start();
  if (mode !== "mediasoup") {
    client.stop();
    return null;
  }

  for (const [, stream] of client.getRemoteStreams()) {
    if (stream.getVideoTracks().some((t) => t.readyState === "live")) {
      opts.onRemoteStream(stream);
      break;
    }
  }

  return { stop: () => client.stop() };
}
