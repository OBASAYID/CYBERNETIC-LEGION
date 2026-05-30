/**
 * Unified group / conference call hook — SFU (mediasoup) or star relay fallback.
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import type { CyrusSfuMode, GroupCallSessionInfo } from "@shared/comms/sfu-types";
import { CyrusSfuClient } from "../realtime/cyrus-sfu-client";
import { CyrusStarGroupCall } from "../realtime/cyrus-star-group-call";
import { systemFetch } from "@shared/cyrus-api-client";

export type GroupCallParticipantView = {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
};

export type ActiveGroupCall = {
  roomId: string;
  callType: "audio" | "video";
  sfuMode: CyrusSfuMode;
  hostPeerId: string;
  isHost: boolean;
  participants: GroupCallParticipantView[];
};

type UseCyrusGroupCallOptions = {
  socketRef: MutableRefObject<Socket | null>;
  selfId: string | null;
  displayName: string;
  isConnected: boolean;
};

export function useCyrusGroupCall({
  socketRef,
  selfId,
  displayName,
  isConnected,
}: UseCyrusGroupCallOptions) {
  const [incomingGroupCall, setIncomingGroupCall] = useState<
    (GroupCallSessionInfo & { callerName: string; groupName?: string }) | null
  >(null);
  const [activeGroupCall, setActiveGroupCall] = useState<ActiveGroupCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [sfuStatus, setSfuStatus] = useState<CyrusSfuMode>("star");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const sfuRef = useRef<CyrusSfuClient | null>(null);
  const starRef = useRef<CyrusStarGroupCall | null>(null);
  const activeGroupCallRef = useRef<ActiveGroupCall | null>(null);
  const participantNamesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    activeGroupCallRef.current = activeGroupCall;
  }, [activeGroupCall]);

  useEffect(() => {
    void systemFetch("/api/comms/sfu/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.mode) setSfuStatus(j.mode as CyrusSfuMode);
      })
      .catch(() => {});
  }, []);

  const teardown = useCallback(() => {
    sfuRef.current?.stop();
    sfuRef.current = null;
    starRef.current?.stop();
    starRef.current = null;
    setLocalStream(null);
    setActiveGroupCall(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
  }, []);

  const upsertParticipant = useCallback((peerId: string, stream: MediaStream | null) => {
    setActiveGroupCall((prev) => {
      if (!prev) return prev;
      const name = participantNamesRef.current.get(peerId) || peerId;
      const others = prev.participants.filter((p) => p.peerId !== peerId);
      return {
        ...prev,
        participants: [...others, { peerId, displayName: name, stream }],
      };
    });
  }, []);

  const startMediaSession = useCallback(
    async (info: GroupCallSessionInfo, existingPeerIds: string[], peerNames: Record<string, string>) => {
      const socket = socketRef.current;
      if (!socket || !selfId) return;
      participantNamesRef.current = new Map(Object.entries(peerNames));
      const isHost = info.hostPeerId === selfId;

      setActiveGroupCall({
        roomId: info.roomId,
        callType: info.callType,
        sfuMode: info.sfuMode === "mediasoup" ? "mediasoup" : "star",
        hostPeerId: info.hostPeerId,
        isHost,
        participants: [],
      });

      const trySfu = async (): Promise<boolean> => {
        const client = new CyrusSfuClient(
          socket,
          info.roomId,
          displayName,
          info.callType,
          ({ peerId, stream }) => upsertParticipant(peerId, stream),
        );
        const mode = await client.start();
        if (mode === "mediasoup") {
          sfuRef.current = client;
          setLocalStream(client.getLocalStream());
          for (const [peerId, stream] of client.getRemoteStreams()) {
            upsertParticipant(peerId, stream);
          }
          return true;
        }
        client.stop();
        return false;
      };

      const usedSfu = await trySfu();

      if (!usedSfu) {
        const star = new CyrusStarGroupCall(
          socket,
          info.roomId,
          selfId,
          info.hostPeerId,
          isHost,
          info.callType,
          (peerId, stream) => upsertParticipant(peerId, stream),
          (peerId) => {
            setActiveGroupCall((prev) =>
              prev
                ? {
                    ...prev,
                    participants: prev.participants.filter((p) => p.peerId !== peerId),
                  }
                : prev,
            );
          },
        );
        starRef.current = star;
        await star.start(existingPeerIds);
        setLocalStream(star.getLocalStream());
      }

      setActiveGroupCall((prev) =>
        prev && prev.roomId === info.roomId
          ? { ...prev, sfuMode: usedSfu ? "mediasoup" : "star" }
          : prev,
      );
    },
    [socketRef, selfId, displayName, upsertParticipant],
  );

  const createGroupCall = useCallback(
    (
      participantIds: string[],
      callType: "audio" | "video",
      groupName?: string,
      roomId?: string,
    ) => {
      const socket = socketRef.current;
      if (!socket?.connected || !selfId) return;

      const onCreated = (ack: {
        roomId?: string;
        callType?: "audio" | "video";
        participants?: string[];
        hostPeerId?: string;
        sfuMode?: CyrusSfuMode;
      }) => {
        socket.off("group-call-created", onCreated);
        if (!ack?.roomId) return;
        const info: GroupCallSessionInfo = {
          roomId: ack.roomId,
          callType: ack.callType || callType,
          hostPeerId: ack.hostPeerId || selfId,
          sfuMode: ack.sfuMode || sfuStatus,
          participants: ack.participants || [selfId],
        };
        void startMediaSession(info, [], { [selfId]: displayName });
      };

      socket.on("group-call-created", onCreated);
      socket.emit("create-group-call", { participantIds, callType, groupName, roomId });
    },
    [socketRef, selfId, displayName, sfuStatus, startMediaSession],
  );

  const joinGroupCall = useCallback(
    (roomId: string) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      socket.emit("join-group-call", { roomId });
    },
    [socketRef],
  );

  const acceptIncomingGroupCall = useCallback(() => {
    if (!incomingGroupCall) return;
    joinGroupCall(incomingGroupCall.roomId);
    setIncomingGroupCall(null);
  }, [incomingGroupCall, joinGroupCall]);

  const declineIncomingGroupCall = useCallback(() => {
    setIncomingGroupCall(null);
  }, []);

  const endGroupCall = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !activeGroupCall) {
      teardown();
      return;
    }
    socket.emit("end-call", { roomId: activeGroupCall.roomId });
    teardown();
  }, [socketRef, activeGroupCall, teardown]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStream?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      const next = !prev;
      localStream?.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
      return next;
    });
  }, [localStream]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    const onIncoming = (data: {
      roomId: string;
      callType: "audio" | "video";
      callerId: string;
      callerName: string;
      groupName?: string;
      participants?: string[];
    }) => {
      setIncomingGroupCall({
        roomId: data.roomId,
        callType: data.callType,
        callerName: data.callerName,
        groupName: data.groupName,
        hostPeerId: data.callerId,
        sfuMode: sfuStatus,
        participants: data.participants || [],
      });
      participantNamesRef.current.set(data.callerId, data.callerName);
    };

    const onJoined = (data: {
      roomId: string;
      callType: "audio" | "video";
      participants: string[];
      existingPeers: string[];
      hostPeerId?: string;
      sfuMode?: CyrusSfuMode;
    }) => {
      const hostPeerId = data.hostPeerId || data.existingPeers[0] || selfId || "";
      const info: GroupCallSessionInfo = {
        roomId: data.roomId,
        callType: data.callType,
        hostPeerId,
        sfuMode: data.sfuMode || sfuStatus,
        participants: data.participants,
      };
      void startMediaSession(info, data.existingPeers || [], {});
    };

    const onPeerJoined = (data: { roomId: string; peerId: string; peerName: string }) => {
      participantNamesRef.current.set(data.peerId, data.peerName);
      void starRef.current?.onPeerJoined(data.peerId);
    };

    const onCallEnded = (data: { roomId: string }) => {
      if (activeGroupCallRef.current?.roomId === data.roomId) {
        teardown();
      }
    };

    const onPeerLeft = (data: { roomId: string; peerId: string }) => {
      setActiveGroupCall((prev) => {
        if (prev?.roomId !== data.roomId) return prev;
        return {
          ...prev,
          participants: prev.participants.filter((p) => p.peerId !== data.peerId),
        };
      });
    };

    socket.on("incoming-group-call", onIncoming);
    socket.on("group-call-joined", onJoined);
    socket.on("group-call-started", onJoined);
    socket.on("peer-joined", onPeerJoined);
    socket.on("call-ended", onCallEnded);
    socket.on("peer-left", onPeerLeft);

    return () => {
      socket.off("incoming-group-call", onIncoming);
      socket.off("group-call-joined", onJoined);
      socket.off("group-call-started", onJoined);
      socket.off("peer-joined", onPeerJoined);
      socket.off("call-ended", onCallEnded);
      socket.off("peer-left", onPeerLeft);
    };
  }, [socketRef, isConnected, selfId, sfuStatus, startMediaSession, teardown]);

  useEffect(() => () => teardown(), [teardown]);

  return {
    sfuStatus,
    incomingGroupCall,
    activeGroupCall,
    localStream,
    isMuted,
    isVideoEnabled,
    createGroupCall,
    joinGroupCall,
    acceptIncomingGroupCall,
    declineIncomingGroupCall,
    endGroupCall,
    toggleMute,
    toggleVideo,
  };
}
