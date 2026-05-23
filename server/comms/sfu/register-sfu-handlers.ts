/**
 * Socket.IO handlers for mediasoup SFU (when worker is online).
 */
import type { Server as SocketIOServer, Socket } from "socket.io";
import {
  buildSfuPeerKey,
  sfuConnectTransport,
  sfuConsume,
  sfuCreateWebRtcTransport,
  sfuJoinRoom,
  sfuLeaveRoom,
  sfuListProducers,
  sfuProduce,
  sfuResumeConsumer,
  getSfuMode,
} from "./sfu-manager.js";

function socketUserId(socket: Socket): string | null {
  return ((socket as unknown as { userId?: string }).userId || null) as string | null;
}

function sfuPeerKey(socket: Socket): string | null {
  const userId = socketUserId(socket);
  if (!userId) return null;
  return buildSfuPeerKey(userId, socket.id);
}

export function registerSfuSocketHandlers(io: SocketIOServer): void {
  io.on("connection", (socket: Socket) => {
    socket.on("sfu-join", async (data: { roomId: string; displayName?: string }, ack?: (r: unknown) => void) => {
      try {
        const userId = socketUserId(socket);
        if (!userId || !data?.roomId) {
          ack?.({ ok: false, error: "missing-user-or-room" });
          return;
        }
        const result = await sfuJoinRoom({
          roomId: data.roomId,
          userId,
          socketId: socket.id,
          displayName: data.displayName || userId,
        });
        socket.join(`sfu_${data.roomId}`);
        ack?.({ ok: true, sfuMode: getSfuMode(), ...result });
      } catch (e) {
        ack?.({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    });

    socket.on(
      "sfu-create-transport",
      async (data: { roomId: string; direction: "send" | "recv" }, ack?: (r: unknown) => void) => {
        try {
          const peerKey = sfuPeerKey(socket);
          if (!peerKey) {
            ack?.({ ok: false, error: "unauthenticated" });
            return;
          }
          const transport = await sfuCreateWebRtcTransport(data.roomId, peerKey, data.direction);
          ack?.({ ok: true, transport });
        } catch (e) {
          ack?.({ ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      },
    );

    socket.on(
      "sfu-connect-transport",
      async (
        data: { roomId: string; direction: "send" | "recv"; dtlsParameters: unknown },
        ack?: (r: unknown) => void,
      ) => {
        try {
          const peerKey = sfuPeerKey(socket);
          if (!peerKey) {
            ack?.({ ok: false, error: "unauthenticated" });
            return;
          }
          await sfuConnectTransport(
            data.roomId,
            peerKey,
            data.direction,
            data.dtlsParameters as import("mediasoup").types.DtlsParameters,
          );
          ack?.({ ok: true });
        } catch (e) {
          ack?.({ ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      },
    );

    socket.on(
      "sfu-produce",
      async (
        data: { roomId: string; kind: "audio" | "video"; rtpParameters: unknown },
        ack?: (r: unknown) => void,
      ) => {
        try {
          const peerKey = sfuPeerKey(socket);
          const userId = socketUserId(socket);
          if (!peerKey || !userId) {
            ack?.({ ok: false, error: "unauthenticated" });
            return;
          }
          const { producerId } = await sfuProduce(
            data.roomId,
            peerKey,
            data.kind,
            data.rtpParameters as import("mediasoup").types.RtpParameters,
          );
          socket.to(`sfu_${data.roomId}`).emit("sfu-new-producer", {
            roomId: data.roomId,
            producerId,
            peerId: userId,
            kind: data.kind,
          });
          ack?.({ ok: true, producerId });
        } catch (e) {
          ack?.({ ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      },
    );

    socket.on(
      "sfu-consume",
      async (
        data: { roomId: string; producerId: string; rtpCapabilities: unknown },
        ack?: (r: unknown) => void,
      ) => {
        try {
          const peerKey = sfuPeerKey(socket);
          if (!peerKey) {
            ack?.({ ok: false, error: "unauthenticated" });
            return;
          }
          const consumer = await sfuConsume(
            data.roomId,
            peerKey,
            data.producerId,
            data.rtpCapabilities as import("mediasoup").types.RtpCapabilities,
          );
          ack?.({ ok: true, consumer });
        } catch (e) {
          ack?.({ ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      },
    );

    socket.on(
      "sfu-resume-consumer",
      async (data: { roomId: string; consumerId: string }, ack?: (r: unknown) => void) => {
        try {
          const peerKey = sfuPeerKey(socket);
          if (!peerKey) {
            ack?.({ ok: false, error: "unauthenticated" });
            return;
          }
          await sfuResumeConsumer(data.roomId, peerKey, data.consumerId);
          ack?.({ ok: true });
        } catch (e) {
          ack?.({ ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      },
    );

    socket.on("sfu-get-producers", (data: { roomId: string }, ack?: (r: unknown) => void) => {
      const peerKey = sfuPeerKey(socket);
      if (!peerKey) {
        ack?.({ ok: false, error: "unauthenticated" });
        return;
      }
      ack?.({ ok: true, producers: sfuListProducers(data.roomId, peerKey) });
    });

    socket.on("sfu-leave", (data: { roomId: string }) => {
      const userId = socketUserId(socket);
      if (!userId || !data?.roomId) return;
      sfuLeaveRoom(data.roomId, userId, socket.id);
      socket.leave(`sfu_${data.roomId}`);
    });

    socket.on("disconnect", () => {
      const userId = socketUserId(socket);
      if (!userId) return;
      for (const roomId of peersByRoomIdsForSocket(socket)) {
        sfuLeaveRoom(roomId, userId, socket.id);
      }
    });
  });
}

/** Best-effort SFU room cleanup on disconnect (rooms joined via sfu_*). */
function peersByRoomIdsForSocket(socket: Socket): string[] {
  const rooms = [...socket.rooms];
  return rooms.filter((r) => r.startsWith("sfu_")).map((r) => r.slice(4));
}
