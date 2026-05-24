import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readHandoff } from "@shared/module-handoff";
import { systemFetch, commsAssetUrl } from "@shared/cyrus-api-client";
import { useComms } from "../hooks/useComms";
import { usePresence } from "../contexts/PresenceContext";
import { useLocation } from "wouter";
import { MessageSquare, Phone, Users, Activity, X, Radio, Share2 } from "lucide-react";
import { CommsPlatform } from "../components/comms/CommsPlatform";
import { CommsUserRoster } from "../components/comms/CommsUserRoster";
import { Conversation } from "../components/comms/ConversationList";
import { CommsMessage } from "../components/comms/MessageBubble";
import { CallView, CallParticipant, IncomingCallOverlay } from "../components/comms/CallView";
import { UserDiscovery } from "../components/comms/UserDiscovery";
import { AdminDashboard } from "../components/comms/AdminDashboard";
import { EmojiPicker } from "../components/comms/EmojiPicker";
import { LiveStreamPanel, LiveStream } from "../components/comms/LiveStreamPanel";
import { Reaction } from "../components/comms/FloatingReactions";
import { CommsIntelligence } from "../components/comms/CommsIntelligence";
import { PsharePanel } from "../components/comms/PsharePanel";
import { useAnomalyAlerts } from "../hooks/useCommsIntelligence";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import { CommsP2PLayerProvider, useCommsP2PLayer } from "../components/comms/CommsP2PLayerContext";
import { CommsP2PCallDock } from "../components/comms/CommsP2PUnifiedUI";
import {
  fromSocketMessageSent,
  fromSocketNewMessage,
  mapServerMessageToComms,
} from "../lib/comms-message-map";
import { getCommsDeviceId } from "../lib/comms-device-id";
import { normalizeAvatarUploadFile } from "../lib/comms-avatar-upload";
import { uploadAndBuildCommsMediaPayload } from "../lib/comms-media-upload";
import { buildTypingPayload, isGroupConversationId } from "../lib/comms-outbound";
import { presetToCallQualityLabel } from "../lib/comms-call-media";
import { buildOrbitalForwardSlots, writeOrbitalSlotPin } from "../lib/comms-orbital-integration";
import { callShellVisible } from "@shared/calls/call-session-types";
import { CommsCallDiagnosticsOverlay } from "../components/comms/CommsCallDiagnosticsOverlay";
import { ConferenceQuickPanel } from "../components/comms/ConferenceQuickPanel";
import { GroupCallPanel } from "../components/comms/GroupCallPanel";
import { useCyrusGroupCall } from "../hooks/useCyrusGroupCall";
import { useCommsSessionRecording } from "../hooks/useCommsSessionRecording";
import { SessionRecordingsPanel } from "../components/comms/SessionRecordingsPanel";
import type { CommsConference } from "../lib/comms-conference-api";
import { CommsPremiumShell } from "../components/comms/CommsPremiumShell";
import { CommsOrbitalDeckConnected } from "../components/comms/CommsOrbitalDeckConnected";
import { NexusModuleSurface } from "../components/comms/NexusModuleSurface";

type MainTab = "chat" | "calls" | "people" | "streams" | "monitor" | "pshare";

const MODULE_SECTOR_SUBTITLE: Record<MainTab, string> = {
  chat: "Encrypted messaging, voice notes, media & 3D CAD",
  pshare: "Timeline, handoffs, and field posts",
  calls: "Mesh calls, quick dial, and conference bridge",
  people: "Presence, roster, and discovery",
  streams: "Live broadcast mesh",
  monitor: "AI command console · intelligence & admin",
};

function conversationPreviewLine(msg: {
  content: string;
  messageType?: string | null;
  fileUrl?: string | null;
  fileMimeType?: string | null;
}): string {
  const mt = (msg.messageType || "").toLowerCase();
  if (mt === "voice-note") return "🎤 Voice message";
  if (mt === "location") return "📍 Location";
  if (mt === "cad-3d") return "🧊 3D model";
  if (mt === "emoji") return msg.content || "Emoji";
  if (mt === "media" || mt === "file" || mt === "cad-3d" || msg.fileUrl) {
    const m = msg.fileMimeType || "";
    if (mt === "cad-3d") return "🧊 3D model";
    if (m.startsWith("image/")) return "📷 Photo";
    if (m.startsWith("video/")) return "🎬 Video";
    if (m.startsWith("audio/")) return "🎵 Audio";
    return "📎 File";
  }
  const c = msg.content || "";
  if (c.startsWith("{") && c.includes("lat") && c.includes("lng")) return "📍 Location";
  if (c.length > 100) return `${c.slice(0, 97)}…`;
  return c;
}

export function CommsPage() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<MainTab>("chat");
  const [psharePostHighlight, setPsharePostHighlight] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("cyrus-theme") !== "light";
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [callChatMessages, setCallChatMessages] = useState<
    {
      senderId: string;
      senderName: string;
      message: string;
      timestamp: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileMimeType?: string;
    }[]
  >([]);
  const [chatGroups, setChatGroups] = useState<Array<{ id: string; name: string; members: string[] }>>([]);
  const pendingGroupBootstrapRef = useRef<{ message: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [selectedConvForMessage, setSelectedConvForMessage] = useState<string | null>(null);
  const [callReactions, setCallReactions] = useState<Reaction[]>([]);
  const [remoteRecording, setRemoteRecording] = useState<{ active: boolean; by?: string }>({
    active: false,
  });
  const [callQuality, setCallQuality] = useState<"HD" | "SD" | "Low">("HD");
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [localMessages, setLocalMessages] = useState<CommsMessage[]>([]);
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [commsHandoffText, setCommsHandoffText] = useState<string | null>(null);
  const [commsHandoffNote, setCommsHandoffNote] = useState<string | null>(null);
  const [localChatAvatar, setLocalChatAvatar] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem("cyrus-chat-avatar") : null
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [newChatMode, setNewChatMode] = useState(false);
  const [newChatCascadeKey, setNewChatCascadeKey] = useState(0);
  const [newChatPicks, setNewChatPicks] = useState<string[]>([]);
  const [orbitalAssignSlot, setOrbitalAssignSlot] = useState<number | null>(null);
  const [slotPinRevision, setSlotPinRevision] = useState(0);
  const [networkMapExpanded, setNetworkMapExpanded] = useState(true);
  const [orbitalConference, setOrbitalConference] = useState<CommsConference | null>(null);
  const noopSetChatPanel = useCallback((_open: boolean) => {}, []);

  const {
    messages,
    contacts,
    allUsers,
    sendMessage,
    addContact,
    deleteContact,
    myDeviceId,
  } = useComms();

  const {
    onlineUsers,
    isConnected,
    myUserId,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    mediaControls,
    callDuration,
    connectPresence,
    callUser,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    sendMessage: presenceSendMessage,
    sendChatMessage: presenceSendChatMessage,
    wsRef,
    callDiagnostics,
    reportRemoteMediaPlayback,
    recoverCallMedia,
    isScreenSharing,
    screenShareStream,
    remoteScreenSharerName,
    startScreenShare,
    stopScreenShare,
    sendCallChatMessage,
  } = usePresence();

  const myId = myUserId || myDeviceId;

  const {
    sfuStatus,
    incomingGroupCall,
    activeGroupCall,
    localStream: groupLocalStream,
    isMuted: groupMuted,
    isVideoEnabled: groupVideoEnabled,
    createGroupCall,
    joinGroupCall,
    acceptIncomingGroupCall,
    declineIncomingGroupCall,
    endGroupCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
  } = useCyrusGroupCall({
    socketRef: wsRef,
    selfId: myId,
    displayName,
    isConnected,
  });

  const activeSessionRoomId = activeCall?.roomId ?? activeGroupCall?.roomId ?? null;
  const activeSessionCallType = activeCall?.callType ?? activeGroupCall?.callType ?? "audio";
  const activeSessionLocalStream = activeCall ? localStream : groupLocalStream;
  const activeSessionRemoteStreams = useMemo(() => {
    if (activeCall && remoteStream) return [remoteStream];
    if (activeGroupCall) {
      return activeGroupCall.participants
        .map((p) => p.stream)
        .filter((s): s is MediaStream => Boolean(s));
    }
    return [];
  }, [activeCall, remoteStream, activeGroupCall]);

  const sessionRecording = useCommsSessionRecording({
    roomId: activeSessionRoomId,
    callType: activeSessionCallType,
    localStream: activeSessionLocalStream,
    remoteStreams: activeSessionRemoteStreams,
    screenShareStream:
      isScreenSharing && screenShareStream ? screenShareStream : undefined,
    recordedBy: myId,
    displayName,
    socketRef: wsRef,
  });

  useEffect(() => {
    if (!activeSessionRoomId) {
      setRemoteRecording({ active: false });
    }
  }, [activeSessionRoomId]);

  useEffect(() => {
    const sock = wsRef.current;
    if (!sock) return;
    const handler = (data: {
      roomId: string;
      isRecording: boolean;
      userId?: string;
      displayName?: string;
    }) => {
      if (!activeSessionRoomId || data.roomId !== activeSessionRoomId) return;
      if (data.userId && data.userId === myId) return;
      setRemoteRecording({
        active: Boolean(data.isRecording),
        by: data.displayName,
      });
    };
    sock.on("session-recording-state", handler);
    return () => {
      sock.off("session-recording-state", handler);
    };
  }, [activeSessionRoomId, myId, wsRef]);

  const handleToggleRecording = useCallback(async () => {
    if (sessionRecording.isRecording) {
      await sessionRecording.stopRecording();
    } else {
      sessionRecording.startRecording();
    }
  }, [sessionRecording]);

  const myUserIdRef = useRef(myUserId);
  const myDeviceIdRef = useRef(myDeviceId);
  const displayNameRef = useRef(displayName);
  const presenceSendChatMessageRef = useRef(presenceSendChatMessage);
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);
  useEffect(() => { myDeviceIdRef.current = myDeviceId; }, [myDeviceId]);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);
  useEffect(() => { presenceSendChatMessageRef.current = presenceSendChatMessage; }, [presenceSendChatMessage]);

  useEffect(() => {
    if (!activeCall) setCallChatMessages([]);
  }, [activeCall?.roomId, activeCall]);

  useEffect(() => {
    const preset = callDiagnostics?.abrPreset;
    if (preset) {
      setCallQuality(presetToCallQualityLabel(preset));
    }
  }, [callDiagnostics?.abrPreset]);

  useEffect(() => {
    const uid = myUserId || myDeviceId;
    if (!uid) return;
    void systemFetch("/api/comms/groups", {
      headers: { "X-Device-Id": getCommsDeviceId(), "X-User-Id": uid },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Array<{ id: string; name: string; members?: string[] }>) => {
        if (Array.isArray(rows)) {
          setChatGroups(rows.map((g) => ({ id: g.id, name: g.name, members: g.members || [] })));
        }
      })
      .catch(() => {});
  }, [myUserId, myDeviceId]);

  useEffect(() => {
    const savedName = localStorage.getItem("cyrus-display-name") || "CYRUS User";
    setDisplayName(savedName);
    // Always ask Presence to connect on mount; it no-ops if already connected (avoids stale
    // `isConnected` from a previous mount under React Strict Mode leaving the socket disconnected).
    connectPresence(savedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap; connectPresence is stable enough for first paint
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("tab") === "pshare") {
      setActiveTab("pshare");
    }
    if (p.get("tab") === "p2p") {
      setActiveTab("calls");
    }
    const pid = p.get("post");
    if (pid) {
      setPsharePostHighlight(pid);
    }
    if (p.get("handoff") === "1") {
      const h = readHandoff(true);
      if (h?.text) {
        setCommsHandoffText(h.text);
        setCommsHandoffNote(h.note ?? `From ${h.sourceModule}`);
        if (p.get("tab") === "pshare") setActiveTab("pshare");
      }
    }
  }, [location]);

  useEffect(() => {
    localStorage.setItem("cyrus-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const refreshLiveStreams = useCallback(() => {
    systemFetch("/api/comms/live-streams")
      .then((res) => res.json())
      .then((data) => {
        if (data.streams) {
          setLiveStreams(
            data.streams.map((s: Record<string, unknown>) => ({
              streamId: String(s.streamId),
              streamName: String(s.streamName),
              sourceType: s.sourceType as LiveStream["sourceType"],
              sourceUrl: s.sourceUrl ? String(s.sourceUrl) : undefined,
              broadcasterId: String(s.broadcasterId),
              broadcasterName: s.broadcasterName ? String(s.broadcasterName) : undefined,
              viewers: (s.viewers as LiveStream["viewers"]) || [],
              status: (s.status as LiveStream["status"]) || "active",
              quality: (s.quality as LiveStream["quality"]) || "720p",
              startTime: String(s.startTime),
              endTime: s.endTime ? String(s.endTime) : undefined,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshLiveStreams();
  }, [refreshLiveStreams]);

  useEffect(() => {
    const socket = wsRef.current;
    if (!socket) return;

    const handleTypingStart = (data: { userId: string; userName: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const users = prev[data.conversationId] || [];
        if (!users.includes(data.userName)) {
          return { ...prev, [data.conversationId]: [...users, data.userName] };
        }
        return prev;
      });
    };

    const handleTypingStop = (data: { userId: string; userName: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const users = (prev[data.conversationId] || []).filter(u => u !== data.userName);
        return { ...prev, [data.conversationId]: users };
      });
    };

    const handleNewMessage = (data: {
      id: string;
      senderId: string;
      senderName: string;
      message: string;
      messageType?: string;
      timestamp: string;
      groupId?: string;
      fileUrl?: string;
      fileName?: string;
      fileMimeType?: string;
      fileSizeBytes?: number;
      voiceDurationSeconds?: number;
      latitude?: number;
      longitude?: number;
    }) => {
      const me = myUserIdRef.current || myDeviceIdRef.current || "";
      const newMsg: CommsMessage = fromSocketNewMessage(
        {
          id: data.id || `local_${Date.now()}`,
          senderId: data.senderId,
          senderName: data.senderName,
          message: data.message,
          messageType: data.messageType,
          groupId: data.groupId,
          timestamp: data.timestamp || new Date().toISOString(),
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileMimeType: data.fileMimeType,
          fileSizeBytes: data.fileSizeBytes,
          voiceDurationSeconds: data.voiceDurationSeconds,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        me
      );
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/comms/messages"] });
    };

    const handleMessageSent = (data: {
      id: string;
      recipientId: string;
      groupId?: string;
      message: string;
      messageType?: string;
      timestamp: string;
      fileUrl?: string;
      fileName?: string;
      fileMimeType?: string;
      fileSizeBytes?: number;
      voiceDurationSeconds?: number;
      latitude?: number;
      longitude?: number;
    }) => {
      const me = myUserIdRef.current || myDeviceIdRef.current || "";
      const sentMsg: CommsMessage = fromSocketMessageSent(
        {
          id: data.id || `sent_${Date.now()}`,
          recipientId: data.groupId || data.recipientId,
          groupId: data.groupId,
          message: data.message,
          messageType: data.messageType,
          timestamp: data.timestamp || new Date().toISOString(),
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileMimeType: data.fileMimeType,
          fileSizeBytes: data.fileSizeBytes,
          voiceDurationSeconds: data.voiceDurationSeconds,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        me,
        displayNameRef.current
      );
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/comms/messages"] });
    };

    const handleCallChatMessage = (data: {
      senderId: string;
      senderName: string;
      message: string;
      timestamp: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileMimeType?: string;
    }) => {
      setCallChatMessages((prev) => {
        const sig = `${data.senderId}|${data.timestamp}|${data.fileUrl ?? ""}|${data.message}`;
        if (prev.some((m) => `${m.senderId}|${m.timestamp}|${m.fileUrl ?? ""}|${m.message}` === sig)) {
          return prev;
        }
        return [...prev, data];
      });
    };

    const handleReactionReceived = (data: { emoji: string; x: number; y: number; userId: string }) => {
      setCallReactions(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        emoji: data.emoji,
        x: data.x,
        y: data.y,
        userId: data.userId,
        timestamp: Date.now(),
      }]);
    };

    const handleCallQualityUpdated = (data: { quality: string }) => {
      if (data.quality === "HD" || data.quality === "SD" || data.quality === "Low") {
        setCallQuality(data.quality);
      }
    };

    const handleLiveStreamStarted = (data: any) => {
      setLiveStreams(prev => {
        if (prev.some(s => s.streamId === data.streamId)) return prev;
        return [...prev, {
          streamId: data.streamId,
          streamName: data.streamName || "Stream",
          sourceType: data.sourceType || "webcam",
          sourceUrl: data.sourceUrl,
          broadcasterId: data.broadcasterId || "",
          broadcasterName: data.broadcasterName,
          viewers: [],
          status: "active" as const,
          quality: data.quality || "720p",
          startTime: data.startTime || new Date().toISOString(),
        }];
      });
    };

    const handleLiveStreamEnded = (data: { streamId: string }) => {
      setLiveStreams(prev => prev.filter(s => s.streamId !== data.streamId));
    };

    const handleStreamViewerJoined = (data: { streamId: string; userId: string }) => {
      setLiveStreams(prev => prev.map(s =>
        s.streamId === data.streamId
          ? { ...s, viewers: [...s.viewers, { userId: data.userId, joinedAt: new Date().toISOString() }] }
          : s
      ));
    };

    const handleStreamViewerLeft = (data: { streamId: string; userId: string }) => {
      setLiveStreams(prev => prev.map(s =>
        s.streamId === data.streamId
          ? { ...s, viewers: s.viewers.filter(v => v.userId !== data.userId) }
          : s
      ));
    };

    const handleGroupCreated = (data: {
      groupId: string;
      name: string;
      members: string[];
    }) => {
      setChatGroups((prev) => {
        if (prev.some((g) => g.id === data.groupId)) return prev;
        return [...prev, { id: data.groupId, name: data.name, members: data.members || [] }];
      });
      setPendingConversationId(data.groupId);
      setActiveTab("chat");
      setNewChatMode(false);
      setNewChatPicks([]);
      const bootstrap = pendingGroupBootstrapRef.current;
      if (bootstrap?.message.trim()) {
        presenceSendChatMessageRef.current(data.groupId, { message: bootstrap.message, messageType: "text" });
        pendingGroupBootstrapRef.current = null;
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-sent", handleMessageSent);
    socket.on("typing-started", handleTypingStart);
    socket.on("typing-stopped", handleTypingStop);
    socket.on("call-chat-message", handleCallChatMessage);
    socket.on("group-created", handleGroupCreated);
    socket.on("reaction-received", handleReactionReceived);
    socket.on("call-quality-updated", handleCallQualityUpdated);
    socket.on("live-stream-started", handleLiveStreamStarted);
    socket.on("live-stream-ended", handleLiveStreamEnded);
    socket.on("stream-viewer-joined", handleStreamViewerJoined);
    socket.on("stream-viewer-left", handleStreamViewerLeft);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-sent", handleMessageSent);
      socket.off("typing-started", handleTypingStart);
      socket.off("typing-stopped", handleTypingStop);
      socket.off("call-chat-message", handleCallChatMessage);
      socket.off("group-created", handleGroupCreated);
      socket.off("reaction-received", handleReactionReceived);
      socket.off("call-quality-updated", handleCallQualityUpdated);
      socket.off("live-stream-started", handleLiveStreamStarted);
      socket.off("live-stream-ended", handleLiveStreamEnded);
      socket.off("stream-viewer-joined", handleStreamViewerJoined);
      socket.off("stream-viewer-left", handleStreamViewerLeft);
    };
  }, [queryClient, isConnected, myUserId]);

  const newChatPickCandidates = useMemo(
    () => (allUsers || []).filter((u) => u.id && u.id !== myId).map((u) => ({ id: u.id, displayName: u.displayName })),
    [allUsers, myId]
  );

  const getUserDisplayNameForChat = useCallback(
    (id: string) =>
      allUsers.find((u) => u.id === id)?.displayName ||
      onlineUsers.find((u) => u.id === id)?.displayName ||
      id.slice(0, 8),
    [allUsers, onlineUsers]
  );

  const handleToggleNewChatPick = useCallback((userId: string) => {
    setNewChatPicks((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]));
  }, []);

  const { data: anomalyData } = useAnomalyAlerts(myId);
  const [dismissedAnomalies, setDismissedAnomalies] = useState(false);

  const rosterUsers = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    const on = new Set(onlineUsers.map((u) => u.id));
    const liveProfile = new Map(onlineUsers.map((u) => [u.id, u.profileImageUrl ?? null] as const));
    return allUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      profileImageUrl: commsAssetUrl(liveProfile.get(u.id) ?? u.profileImageUrl) ?? null,
      isOnline: on.has(u.id) || Boolean(u.isOnline),
    }));
  }, [allUsers, onlineUsers]);

  const avatarByUserId = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const u of allUsers) {
      m.set(u.id, u.profileImageUrl ?? null);
    }
    for (const o of onlineUsers) {
      if (o.profileImageUrl) m.set(o.id, o.profileImageUrl);
    }
    if (myId && localChatAvatar) m.set(myId, localChatAvatar);
    return m;
  }, [allUsers, onlineUsers, myId, localChatAvatar]);

  const getAvatarForUser = useCallback(
    (id: string) => commsAssetUrl(avatarByUserId.get(id) ?? null),
    [avatarByUserId]
  );

  const forwardSlots = useMemo(() => {
    return buildOrbitalForwardSlots({
      myId: myId || "",
      onlineUsers,
      allUsers: allUsers || [],
      contacts: contacts || [],
      resolveAvatar: getAvatarForUser,
    });
  }, [myId, onlineUsers, allUsers, contacts, getAvatarForUser, slotPinRevision]);

  const selectedOrbitalPeerId = pendingConversationId;

  const handleChatAvatarUpload = useCallback(
    async (file: File) => {
      if (!myId) return;
      const normalized = normalizeAvatarUploadFile(file);
      setAvatarUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", normalized, normalized.name);
        const res = await systemFetch("/api/comms/user/avatar", {
          method: "POST",
          body: fd,
          headers: { "X-User-Id": myId, "X-Device-Id": myId },
        });
        const data = (await res.json().catch(() => ({}))) as { profileImageUrl?: string; error?: string };
        if (res.ok && data.profileImageUrl) {
          const resolved = commsAssetUrl(data.profileImageUrl) ?? data.profileImageUrl;
          localStorage.setItem("cyrus-chat-avatar", data.profileImageUrl);
          setLocalChatAvatar(resolved);
          await queryClient.invalidateQueries({ queryKey: ["/api/comms/users/all"] });
        } else {
          console.error("Avatar upload failed:", data.error || res.status);
          window.alert(
            data.error ||
              `Photo upload failed (${res.status}). Try JPG, PNG, WebP, HEIC, or another image under 16 MB.`,
          );
        }
      } catch (e) {
        console.error("Avatar upload failed:", e);
        window.alert("Photo upload failed. Check your connection and try again.");
      } finally {
        setAvatarUploading(false);
      }
    },
    [myId, queryClient],
  );

  useEffect(() => {
    if (selectedConvForMessage) {
      setPendingConversationId(selectedConvForMessage);
      setSelectedConvForMessage(null);
    }
  }, [selectedConvForMessage]);

  const conversations: Conversation[] = useMemo(() => {
    const convMap = new Map<string, Conversation>();
    const allMsgs = [
      ...(messages || []).map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        content: msg.content,
        timestamp: msg.timestamp,
        read: msg.read,
        messageType: msg.messageType,
        fileUrl: msg.fileUrl,
        fileMimeType: msg.fileMimeType,
      })),
      ...localMessages.map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        content: msg.content,
        timestamp: msg.timestamp,
        read: msg.read,
        messageType: msg.type,
        fileUrl: msg.mediaUrl,
        fileMimeType: msg.mediaMimeType,
      })),
    ];
    const seenIds = new Set<string>();
    const dedupedMsgs = allMsgs.filter(m => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });

    for (const msg of dedupedMsgs) {
      const threadId = isGroupConversationId(msg.recipientId)
        ? msg.recipientId
        : msg.senderId === myId
          ? msg.recipientId
          : msg.senderId;
      if (!threadId || threadId === "broadcast") continue;

      if (isGroupConversationId(threadId)) {
        const group = chatGroups.find((g) => g.id === threadId);
        const existing = convMap.get(threadId);
        if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessageTime)) {
          const unread = (existing?.unreadCount || 0) + (msg.senderId !== myId && !msg.read ? 1 : 0);
          convMap.set(threadId, {
            id: threadId,
            name: group?.name || "Group discussion",
            isGroup: true,
            participants: group?.members,
            lastMessage: conversationPreviewLine(msg),
            lastMessageTime: msg.timestamp,
            unreadCount: unread,
          });
        }
        continue;
      }

      const existing = convMap.get(threadId);
      const partnerUser = allUsers.find((u) => u.id === threadId);
      const partnerOnline = onlineUsers.find((u) => u.id === threadId);
      const name =
        partnerUser?.displayName || partnerOnline?.displayName || threadId.substring(0, 12) + "...";
      const isOnline = partnerUser?.isOnline || !!partnerOnline;

      if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessageTime)) {
        const unread = (existing?.unreadCount || 0) + (msg.senderId !== myId && !msg.read ? 1 : 0);
        convMap.set(threadId, {
          id: threadId,
          name,
          isGroup: false,
          lastMessage: conversationPreviewLine(msg),
          lastMessageTime: msg.timestamp,
          unreadCount: unread,
          isOnline,
        });
      }
    }

    for (const g of chatGroups) {
      if (!convMap.has(g.id)) {
        convMap.set(g.id, {
          id: g.id,
          name: g.name,
          isGroup: true,
          participants: g.members,
          lastMessage: "Group thread — share media & CAD",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        });
      }
    }

    if (pendingConversationId && !convMap.has(pendingConversationId)) {
      if (isGroupConversationId(pendingConversationId)) {
        const g = chatGroups.find((x) => x.id === pendingConversationId);
        convMap.set(pendingConversationId, {
          id: pendingConversationId,
          name: g?.name || "Group discussion",
          isGroup: true,
          participants: g?.members,
          lastMessage: "Start the group thread…",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        });
      } else {
        const partnerUser = allUsers.find((u) => u.id === pendingConversationId);
        const partnerOnline = onlineUsers.find((u) => u.id === pendingConversationId);
        const name =
          partnerUser?.displayName ||
          partnerOnline?.displayName ||
          pendingConversationId.substring(0, 12) + "...";
        convMap.set(pendingConversationId, {
          id: pendingConversationId,
          name,
          isGroup: false,
          lastMessage: "Start a conversation...",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          isOnline: !!partnerOnline || partnerUser?.isOnline,
        });
      }
    }

    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [messages, localMessages, myId, allUsers, onlineUsers, pendingConversationId, chatGroups]);

  const getSenderName = useCallback(
    (senderId: string) => {
      if (senderId === myId) return displayName;
      return (
        allUsers.find((u) => u.id === senderId)?.displayName ||
        onlineUsers.find((u) => u.id === senderId)?.displayName ||
        senderId.substring(0, 10)
      );
    },
    [myId, displayName, allUsers, onlineUsers]
  );

  const commsMessages: CommsMessage[] = useMemo(() => {
    const dbMsgs: CommsMessage[] = (messages || []).map((msg) => {
      const m = mapServerMessageToComms(
        {
          id: msg.id,
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          content: msg.content,
          timestamp: msg.timestamp,
          read: msg.read,
          messageType: msg.messageType,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileMimeType: msg.fileMimeType,
          fileSizeBytes: msg.fileSizeBytes,
        },
        getSenderName
      );
      m.senderAvatarUrl = avatarByUserId.get(m.senderId) ?? m.senderAvatarUrl ?? null;
      return m;
    });
    const seenIds = new Set(dbMsgs.map((m) => m.id));
    const newLocalMsgs = localMessages
      .filter((m) => !seenIds.has(m.id))
      .map((m) => ({
        ...m,
        senderAvatarUrl: avatarByUserId.get(m.senderId) ?? m.senderAvatarUrl ?? null,
      }));
    return [...dbMsgs, ...newLocalMsgs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messages, localMessages, getSenderName, avatarByUserId]);

  const handleSendMessage = useCallback(
    (conversationId: string, content: string) => {
      const t = content.trim();
      if (!t) return;
      presenceSendChatMessage(conversationId, { message: t, messageType: "text" });
    },
    [presenceSendChatMessage]
  );

  const handleDismissNewChat = useCallback(() => {
    setNewChatMode(false);
    setNewChatPicks([]);
  }, []);

  const handleNewChatSend = useCallback(
    (content: string) => {
      const t = content.trim();
      if (!t || newChatPicks.length === 0) return;
      const members = newChatPicks.filter((id) => id !== myId);
      if (members.length >= 2 || (members.length >= 1 && newChatPicks.length >= 2)) {
        const label =
          newChatPicks
            .slice(0, 3)
            .map((id) => getUserDisplayNameForChat(id))
            .join(", ") + (newChatPicks.length > 3 ? "…" : "");
        pendingGroupBootstrapRef.current = { message: t };
        wsRef.current?.emit("create-group", {
          name: label || "Group discussion",
          members,
        });
        return;
      }
      const target = newChatPicks[0];
      setPendingConversationId(target);
      presenceSendChatMessage(target, { message: t, messageType: "text" });
      setNewChatMode(false);
      setNewChatPicks([]);
    },
    [newChatPicks, myId, presenceSendChatMessage, getUserDisplayNameForChat, wsRef],
  );

  const handleSendMedia = useCallback(
    async (
      conversationId: string,
      file: File,
      caption: string,
      onProgress?: (progress: import("../lib/comms-media-upload").CommsUploadProgress) => void,
    ) => {
      const uid = myUserId || myDeviceId;
      const payload = await uploadAndBuildCommsMediaPayload(file, caption, uid, undefined, onProgress);
      if (!payload) throw new Error("Upload failed — file may be too large or unsupported");
      presenceSendChatMessage(conversationId, payload);
    },
    [myUserId, myDeviceId, presenceSendChatMessage],
  );

  const handleSendVoice = useCallback(
    async (conversationId: string, blob: Blob, duration: number) => {
      const formData = new FormData();
      formData.append("file", blob, `voice_${Date.now()}.webm`);
      const uid = myUserId || myDeviceId;
      try {
        const res = await systemFetch("/api/comms/voice-note", {
          method: "POST",
          body: formData,
          headers: { "X-Device-Id": getCommsDeviceId(), "X-User-Id": uid },
        });
        if (res.ok) {
          const data = (await res.json()) as { fileUrl: string; mimeType?: string };
          presenceSendChatMessage(conversationId, {
            message: "",
            messageType: "voice-note",
            fileUrl: data.fileUrl,
            fileName: "voice.webm",
            fileMimeType: data.mimeType || "audio/webm",
            fileSizeBytes: blob.size,
            voiceDurationSeconds: Math.round(duration),
          });
        }
      } catch (err) {
        console.error("Voice upload failed:", err);
      }
    },
    [myUserId, myDeviceId, presenceSendChatMessage]
  );

  const handleSendLocation = useCallback(
    (conversationId: string) => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          presenceSendChatMessage(conversationId, {
            message: "📍 Shared location",
            messageType: "location",
            latitude,
            longitude,
          });
        },
        (err) => console.error("Location error:", err),
        { enableHighAccuracy: true }
      );
    },
    [presenceSendChatMessage]
  );

  const handleTypingStart = useCallback(
    (conversationId: string) => {
      wsRef.current?.emit("typing-start", buildTypingPayload(conversationId));
    },
    [wsRef],
  );

  const handleTypingStop = useCallback(
    (conversationId: string) => {
      wsRef.current?.emit("typing-stop", buildTypingPayload(conversationId));
    },
    [wsRef],
  );

  const handleReact = useCallback((messageId: string, emoji: string) => {
    wsRef.current?.emit("message-reaction", { messageId, emoji });
  }, [wsRef]);

  const handleAudioCall = useCallback((conversationId: string, name: string) => {
    callUser(conversationId, name, "audio");
    setActiveTab("chat");
  }, [callUser]);

  const handleVideoCall = useCallback((conversationId: string, name: string) => {
    callUser(conversationId, name, "video");
    setActiveTab("chat");
  }, [callUser]);

  const handleCreateGroup = useCallback(() => {
    const tablePeerIds = forwardSlots
      .map((s) => s.peer)
      .filter((p): p is NonNullable<typeof p> => !!p?.isOnline && p.id !== myId)
      .map((p) => p.id);
    if (tablePeerIds.length >= 2) {
      const label =
        forwardSlots
          .map((s) => s.peer?.displayName)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") || "Round table";
      wsRef.current?.emit("create-group", {
        name: `${label} discussion`,
        members: tablePeerIds,
      });
      setActiveTab("chat");
      return;
    }
    setNewChatMode(true);
    setNewChatCascadeKey((k) => k + 1);
    setNewChatPicks(tablePeerIds);
    setActiveTab("chat");
  }, [forwardSlots, myId, wsRef]);

  const handleNewChat = useCallback(() => {
    setNewChatMode(true);
    setNewChatCascadeKey((k) => k + 1);
    setNewChatPicks([]);
    setActiveTab("chat");
  }, []);

  const handleAddContact = useCallback((contact: { contactId: string; contactName: string }) => {
    addContact.mutate(contact);
  }, [addContact]);

  const handleRemoveContact = useCallback((contactId: string) => {
    deleteContact.mutate(contactId);
  }, [deleteContact]);

  const handleUserMessage = useCallback((userId: string, _userName: string) => {
    if (orbitalAssignSlot !== null) {
      writeOrbitalSlotPin(orbitalAssignSlot, userId);
      setOrbitalAssignSlot(null);
      setSlotPinRevision((r) => r + 1);
    }
    setSelectedConvForMessage(userId);
    setActiveTab("chat");
  }, [orbitalAssignSlot]);

  const handleEmptyOrbitalSlot = useCallback((slotIndex: number, _refLabel: string) => {
    setOrbitalAssignSlot(slotIndex);
    setActiveTab("people");
  }, []);

  const handleUserCall = useCallback((userId: string, userName: string, type: "audio" | "video") => {
    callUser(userId, userName, type);
  }, [callUser]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setShowEmojiPicker(false);
  }, []);

  const handleSendReaction = useCallback((emoji: string, x: number, y: number) => {
    if (!activeCall?.roomId) return;
    wsRef.current?.emit("send-reaction", {
      roomId: activeCall.roomId,
      emoji,
      x,
      y,
    });
    setCallReactions(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      x,
      y,
      userId: myUserId || "",
      timestamp: Date.now(),
    }]);
  }, [wsRef, activeCall, myUserId]);

  const handleCallLocationShare = useCallback(() => {
    if (!activeCall?.roomId || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        wsRef.current?.emit("share-location", {
          roomId: activeCall.roomId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => console.error("Location error:", err),
      { enableHighAccuracy: true }
    );
  }, [wsRef, activeCall]);

  const handleStartStream = useCallback((data: {
    streamName: string;
    sourceType: string;
    sourceUrl?: string;
    quality: string;
  }) => {
    wsRef.current?.emit("start-live-stream", {
      streamName: data.streamName,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      quality: data.quality,
    });
  }, [wsRef]);

  const handleEndStream = useCallback((streamId: string) => {
    wsRef.current?.emit("end-live-stream", { streamId });
  }, [wsRef]);

  const handleJoinStream = useCallback((streamId: string) => {
    wsRef.current?.emit("join-live-stream", { streamId });
  }, [wsRef]);

  const handleLeaveStream = useCallback((streamId: string) => {
    wsRef.current?.emit("leave-live-stream", { streamId });
  }, [wsRef]);

  const handleScreenShareStart = useCallback(async () => {
    await startScreenShare();
  }, [startScreenShare]);

  const handleScreenShareStop = useCallback(async () => {
    await stopScreenShare();
  }, [stopScreenShare]);

  const handleCallChatSend = useCallback((message: string) => {
    if (!activeCall?.roomId || !myUserId) return;
    sendCallChatMessage({ message, messageType: "text" });
  }, [activeCall?.roomId, myUserId, sendCallChatMessage]);

  const handleCallChatMedia = useCallback(
    async (
      file: File,
      caption: string,
      onProgress?: (progress: import("../lib/comms-media-upload").CommsUploadProgress) => void,
    ) => {
      if (!activeCall?.roomId || !myUserId) return;
      const uid = myUserId || myDeviceId;
      const payload = await uploadAndBuildCommsMediaPayload(file, caption, uid, undefined, onProgress);
      if (!payload) throw new Error("Upload failed");
      sendCallChatMessage(payload);
    },
    [activeCall?.roomId, myUserId, myDeviceId, sendCallChatMessage],
  );

  const callParticipants: CallParticipant[] = activeCall
    ? [
        {
          id: activeCall.peerId,
          displayName: activeCall.peerName,
          stream: remoteStream || undefined,
          isMuted: false,
          isVideoEnabled: activeCall.callType === "video",
          connectionQuality:
            callDiagnostics?.qualityScores?.label === "Critical" ||
            callDiagnostics?.qualityScores?.label === "Poor"
              ? "poor"
              : callDiagnostics?.qualityScores?.label === "Good"
                ? "fair"
                : "good",
        },
      ]
    : [];

  const groupCallParticipants: CallParticipant[] = activeGroupCall
    ? activeGroupCall.participants.map((p) => ({
        id: p.peerId,
        displayName: p.displayName,
        stream: p.stream || undefined,
        isVideoEnabled: activeGroupCall.callType === "video",
      }))
    : [];

  const handleConferenceMedia = useCallback(
    (conference: CommsConference, action: "create" | "join") => {
      if (action === "create") {
        createGroupCall([], "video", conference.title, conference.conferenceId);
      } else {
        joinGroupCall(conference.conferenceId);
      }
    },
    [createGroupCall, joinGroupCall],
  );

  const handleStartGroupCall = useCallback(
    (peerIds: string[], callType: "audio" | "video") => {
      createGroupCall(peerIds, callType, "Group call");
    },
    [createGroupCall],
  );

  const activeScreenShareStream =
    isScreenSharing && screenShareStream
      ? screenShareStream
      : remoteScreenSharerName && remoteStream
        ? remoteStream
        : undefined;
  const activeScreenSharerName = isScreenSharing
    ? displayName
    : remoteScreenSharerName || undefined;

  const tabConfig = [
    { id: "chat" as MainTab, icon: MessageSquare, label: "Chat" },
    { id: "pshare" as MainTab, icon: Share2, label: "Timeline" },
    { id: "calls" as MainTab, icon: Phone, label: "Calls" },
    { id: "people" as MainTab, icon: Users, label: "People" },
    { id: "streams" as MainTab, icon: Radio, label: "Streams" },
    { id: "monitor" as MainTab, icon: Activity, label: "Monitor" },
  ];

  const themeClass = darkMode ? "" : "light-theme";

  const anomalyBanner =
    anomalyData?.anomalies && anomalyData.anomalies.length > 0 && !dismissedAnomalies ? (
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-violet-400/30 bg-gradient-to-r from-cyan-950/35 via-violet-950/30 to-cyan-950/25 px-3 py-2 backdrop-blur-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.7)]" />
          <span className="text-xs font-medium text-cyan-100/95">
            {anomalyData.anomalies.length} behavioral anomal{anomalyData.anomalies.length === 1 ? "y" : "ies"}{" "}
            <span className="font-normal text-violet-200/75">· {anomalyData.anomalies[0]?.description}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissedAnomalies(true)}
          className="shrink-0 rounded-lg p-1 text-cyan-300/80 transition hover:bg-cyan-500/15 hover:text-cyan-50"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : null;

  const modulePanelShell = `min-h-0 flex-1 overflow-hidden p-1 sm:p-2 ${
    darkMode
      ? "bg-gradient-to-b from-cyan-950/10 via-transparent to-[#000b1a]/40"
      : "bg-gradient-to-b from-sky-50/30 via-transparent to-slate-100/50"
  }`;

  return (
    <ModuleWorkspacePageShell mode="page" hidePageBackdrop>
    <CommsP2PLayerProvider displayName={displayName}>
    <div className={`flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden ${themeClass}`}>
      <CommsCallDiagnosticsOverlay
        diagnostics={callDiagnostics}
        callStatus={activeCall?.status}
        onRecoverCallMedia={recoverCallMedia}
      />
      {activeCall && callShellVisible(activeCall.status) && (
        <CallView
          roomId={activeCall.roomId}
          callType={activeCall.callType}
          participants={callParticipants}
          localStream={localStream}
          currentUserId={myUserId || ""}
          currentUserName={displayName}
          isMuted={mediaControls.isMuted}
          isVideoEnabled={mediaControls.isVideoEnabled}
          callDuration={callDuration}
          callQuality={callQuality}
          mediaEstablishing={activeCall.status !== "connected"}
          isScreenSharing={isScreenSharing || Boolean(remoteScreenSharerName)}
          screenShareStream={activeScreenShareStream}
          screenSharerName={activeScreenSharerName}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
          onStartScreenShare={handleScreenShareStart}
          onStopScreenShare={handleScreenShareStop}
          onSendChatMessage={handleCallChatSend}
          onSendCallMedia={handleCallChatMedia}
          onSendReaction={handleSendReaction}
          onShareLocation={handleCallLocationShare}
          chatMessages={callChatMessages}
          reactions={callReactions}
          socketRef={wsRef}
          onRemotePlaybackDiagnostics={({ blocked }) => reportRemoteMediaPlayback(blocked)}
          isRecording={sessionRecording.isRecording}
          isRecordingUploading={sessionRecording.isUploading}
          recordingDurationSec={sessionRecording.recordingDurationSec}
          remoteRecordingActive={remoteRecording.active}
          remoteRecordingBy={remoteRecording.by}
          onToggleRecording={() => void handleToggleRecording()}
        />
      )}

      {activeGroupCall && !activeCall && (
        <CallView
          roomId={activeGroupCall.roomId}
          callType={activeGroupCall.callType}
          participants={groupCallParticipants}
          localStream={groupLocalStream}
          currentUserId={myId}
          currentUserName={displayName}
          isMuted={groupMuted}
          isVideoEnabled={groupVideoEnabled}
          callDuration={0}
          callQuality={callQuality}
          onToggleMute={toggleGroupMute}
          onToggleVideo={toggleGroupVideo}
          onEndCall={endGroupCall}
          onSendReaction={handleSendReaction}
          reactions={callReactions}
          socketRef={wsRef}
          isRecording={sessionRecording.isRecording}
          isRecordingUploading={sessionRecording.isUploading}
          recordingDurationSec={sessionRecording.recordingDurationSec}
          remoteRecordingActive={remoteRecording.active}
          remoteRecordingBy={remoteRecording.by}
          onToggleRecording={() => void handleToggleRecording()}
        />
      )}

      {incomingCall && (
        <IncomingCallOverlay
          callerName={incomingCall.callerName}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {incomingGroupCall && !incomingCall && (
        <IncomingCallOverlay
          callerName={incomingGroupCall.callerName}
          callType={incomingGroupCall.callType}
          onAccept={acceptIncomingGroupCall}
          onDecline={declineIncomingGroupCall}
          isGroup
          groupName={incomingGroupCall.groupName}
        />
      )}

      <CommsPremiumShell
        className="min-h-0 flex-1"
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        displayName={displayName}
        isConnected={isConnected}
        onlineUsersLength={onlineUsers.length}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        tabs={tabConfig.map((t) => ({ ...t, subtitle: MODULE_SECTOR_SUBTITLE[t.id] }))}
        handoff={
          commsHandoffText ? (
            <div
              role="status"
              className="flex flex-col gap-2 rounded-xl border border-cyan-500/35 bg-cyan-950/45 px-3 py-2.5 text-cyan-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-xs leading-snug text-cyan-100/95">
                <span className="font-semibold text-white">Pipeline handoff — </span>
                {commsHandoffNote}. Copy into a group chat or open Pshare to post.
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/15"
                  onClick={() => void navigator.clipboard.writeText(commsHandoffText)}
                >
                  Copy text
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-violet-400/40 bg-violet-600/30 px-2.5 py-1 text-[11px] font-medium text-violet-50 hover:bg-violet-600/45"
                  onClick={() => setActiveTab("pshare")}
                >
                  Open Pshare
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10"
                  onClick={() => {
                    setCommsHandoffText(null);
                    setCommsHandoffNote(null);
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className={`flex h-full min-h-0 flex-col ${modulePanelShell}`}>
          {anomalyBanner}

          {activeTab === "chat" && (
            <NexusModuleSurface variant="flush">
              <CommsPlatform
                holoSurface
                conversations={conversations}
                messages={commsMessages}
                currentUserId={myId}
                typingUsers={typingUsers}
                initialConversationId={pendingConversationId}
                onSendMessage={handleSendMessage}
                onSendMedia={handleSendMedia}
                onSendVoice={handleSendVoice}
                onSendLocation={handleSendLocation}
                onToggleEmoji={() => setShowEmojiPicker(true)}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                onReact={handleReact}
                onAudioCall={handleAudioCall}
                onVideoCall={handleVideoCall}
                onCreateGroup={handleCreateGroup}
                onNewChat={handleNewChat}
                getAvatarForUser={getAvatarForUser}
                newChatMode={newChatMode}
                newChatCascadeKey={newChatCascadeKey}
                newChatPicks={newChatPicks}
                onToggleNewChatPick={handleToggleNewChatPick}
                onNewChatSend={handleNewChatSend}
                onDismissNewChat={handleDismissNewChat}
                getUserDisplayName={getUserDisplayNameForChat}
                newChatPickCandidates={newChatPickCandidates}
                roster={
                  <CommsUserRoster
                    holoSurface
                    users={rosterUsers}
                    myUserId={myId}
                    onUploadAvatar={handleChatAvatarUpload}
                    isUploading={avatarUploading}
                    pickMode={newChatMode}
                    pickedUserIds={newChatPicks}
                    onTogglePick={handleToggleNewChatPick}
                  />
                }
              />
            </NexusModuleSurface>
          )}

          {activeTab === "pshare" && (
            <NexusModuleSurface>
              <div className="h-full min-h-0 p-1 sm:p-2">
                <PsharePanel
                  holoBlend
                  myUserId={myId}
                  myDisplayName={displayName}
                  allUsers={allUsers}
                  getAvatarForUser={getAvatarForUser}
                  highlightPostId={psharePostHighlight}
                  onClearHighlight={() => setPsharePostHighlight(null)}
                  initialPostBody={commsHandoffText}
                />
              </div>
            </NexusModuleSurface>
          )}

          {activeTab === "people" && (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div
                className={`shrink-0 border-b ${
                  darkMode ? "border-cyan-500/20 bg-black/25" : "border-sky-200/60 bg-white/40"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setNetworkMapExpanded((v) => !v)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium transition hover:bg-white/5 ${
                    darkMode ? "text-cyan-100/90" : "text-slate-700"
                  }`}
                >
                  <span>Network command map · round-table hub</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
                    {networkMapExpanded ? "Collapse" : "Expand"}
                  </span>
                </button>
                {networkMapExpanded ? (
                  <div className="min-h-[min(52vh,560px)] max-h-[min(72vh,680px)] overflow-hidden border-t border-inherit">
                    <CommsOrbitalDeckConnected
                      darkMode={darkMode}
                      displayName={displayName}
                      isConnected={isConnected}
                      mainUserPhotoUrl={localChatAvatar}
                      onMainUserPhotoUpload={handleChatAvatarUpload}
                      photoUploading={avatarUploading}
                      forwardSlots={forwardSlots}
                      myId={myId}
                      selectedPeerId={selectedOrbitalPeerId}
                      activeTab={activeTab}
                      onSelectTab={setActiveTab}
                      setChatPanelOpen={noopSetChatPanel}
                      setPendingConversationId={setPendingConversationId}
                      setSlotPinRevision={setSlotPinRevision}
                      callUser={callUser}
                      presenceSendChatMessage={presenceSendChatMessage}
                      onConferenceReady={setOrbitalConference}
                      onEmptySlotClick={handleEmptyOrbitalSlot}
                      serviceTitle="Key Event Assurance Service"
                      serviceSubtitle="Delivering network resilience · tap a peer for voice, video, or chat"
                      sceneMode="round-table"
                    />
                  </div>
                ) : null}
              </div>
              <NexusModuleSurface>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-4">
                  <UserDiscoveryWithMesh
                    nexusChrome
                    onlineUsers={onlineUsers}
                    allUsers={allUsers}
                    contacts={contacts}
                    myDeviceId={myDeviceId}
                    onMessage={handleUserMessage}
                    onCall={handleUserCall}
                    onAddContact={handleAddContact}
                    onRemoveContact={handleRemoveContact}
                    onOpenMeshCalls={() => setActiveTab("calls")}
                  />
                </div>
              </NexusModuleSurface>
            </div>
          )}

          {activeTab === "streams" && (
            <NexusModuleSurface>
              <LiveStreamPanel
                holoBlend
                streams={liveStreams}
                currentUserId={myUserId || myDeviceId}
                onStartStream={handleStartStream}
                onEndStream={handleEndStream}
                onJoinStream={handleJoinStream}
                onLeaveStream={handleLeaveStream}
                onRefreshList={refreshLiveStreams}
              />
            </NexusModuleSurface>
          )}

          {activeTab === "monitor" && (
            <NexusModuleSurface>
              <div className="h-full min-h-0 space-y-0 overflow-y-auto overscroll-contain">
                <CommsIntelligence userId={myId} />
                <AdminDashboard />
              </div>
            </NexusModuleSurface>
          )}

          {activeTab === "calls" && (
            <NexusModuleSurface>
              <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
                <CallHistoryPanel
                  myDeviceId={myDeviceId}
                  myUserId={myId}
                  displayName={displayName}
                  allUsers={allUsers}
                  onlineUsers={onlineUsers}
                  onCall={handleUserCall}
                  seedConference={orbitalConference}
                  sfuMode={sfuStatus}
                  onStartGroupCall={handleStartGroupCall}
                  onJoinGroupMedia={joinGroupCall}
                  onConferenceMedia={handleConferenceMedia}
                />
              </div>
            </NexusModuleSurface>
          )}
        </div>
      </CommsPremiumShell>

      {showEmojiPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEmojiPicker(false)} />
          <div className="relative z-10 mb-20">
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        </div>
      )}
    </div>
    </CommsP2PLayerProvider>
    </ModuleWorkspacePageShell>
  );
}

function UserDiscoveryWithMesh(
  props: Omit<React.ComponentProps<typeof UserDiscovery>, "meshPeerIds" | "meshLinkReady" | "meshInCall" | "onMeshCall"> & {
    onOpenMeshCalls: () => void;
    nexusChrome?: boolean;
  },
) {
  const { onOpenMeshCalls, nexusChrome, ...rest } = props;
  const { meshPeerIds, startMeshCall, linkConnected, linkJoined, inMeshCall } = useCommsP2PLayer();
  const onMeshCall = useCallback(
    (userId: string, _userName: string, type: "audio" | "video") => {
      void startMeshCall(userId, type === "video");
      onOpenMeshCalls();
    },
    [startMeshCall, onOpenMeshCalls],
  );
  return (
    <UserDiscovery
      {...rest}
      nexusChrome={nexusChrome}
      meshPeerIds={meshPeerIds}
      meshLinkReady={linkConnected && linkJoined}
      meshInCall={inMeshCall}
      onMeshCall={onMeshCall}
    />
  );
}

function CallHistoryPanel({
  myDeviceId,
  myUserId,
  displayName,
  allUsers,
  onlineUsers,
  onCall,
  seedConference,
  sfuMode,
  onStartGroupCall,
  onJoinGroupMedia,
  onConferenceMedia,
}: {
  myDeviceId: string;
  myUserId: string;
  displayName: string;
  allUsers: { id: string; displayName: string; isOnline: boolean; lastSeen: string | null; status: string }[];
  onlineUsers: { id: string; displayName: string; deviceId: string; inCall: boolean }[];
  onCall: (userId: string, userName: string, type: "audio" | "video") => void;
  seedConference?: import("../lib/comms-conference-api").CommsConference | null;
  sfuMode: import("@shared/comms/sfu-types").CyrusSfuMode;
  onStartGroupCall: (peerIds: string[], callType: "audio" | "video") => void;
  onJoinGroupMedia: (roomId: string) => void;
  onConferenceMedia?: (
    conference: import("../lib/comms-conference-api").CommsConference,
    action: "create" | "join",
  ) => void;
}) {
  const onlineOthers = onlineUsers.filter(u => u.id !== myDeviceId && u.id !== "cyrus-001");

  return (
    <div className="space-y-6">
      {seedConference ? (
        <div className="rounded-xl border border-cyan-500/35 bg-cyan-950/30 px-3 py-2.5 text-xs text-cyan-100/90">
          <p className="font-semibold text-cyan-50">Round-table group call linked</p>
          <p className="mt-0.5 text-[11px] text-cyan-200/75">
            Room <span className="font-mono text-cyan-100">{seedConference.roomCode}</span> — you are joined on the server. Share the code with table peers (invites sent via chat).
          </p>
        </div>
      ) : null}
      <ConferenceQuickPanel
        displayName={displayName}
        seedConference={seedConference}
        onConferenceMedia={onConferenceMedia}
      />
      <GroupCallPanel
        myUserId={myUserId}
        displayName={displayName}
        sfuMode={sfuMode}
        onlinePeers={onlineUsers.map((u) => ({
          id: u.id,
          displayName: u.displayName,
          inCall: u.inCall,
        }))}
        onStartGroupCall={onStartGroupCall}
        onJoinByRoomId={onJoinGroupMedia}
      />
      <CommsP2PCallDock />
      <SessionRecordingsPanel />
      <div>
        <h3
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-200/90"
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          <Phone className="h-4 w-4" />
          Quick call
        </h3>
        <p className="mb-4 text-xs text-white/50">Select an online user to start a call</p>

        {onlineOthers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No other users online</p>
            <p className="text-gray-600 text-xs mt-1">Users will appear here when they connect</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {onlineOthers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-900/40 border border-cyan-900/20 hover:border-cyan-700/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-900" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{user.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {user.inCall ? "In a call" : "Available"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onCall(user.id, user.displayName, "audio")}
                    disabled={user.inCall}
                    className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors disabled:opacity-40"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCall(user.id, user.displayName, "video")}
                    disabled={user.inCall}
                    className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors disabled:opacity-40"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50"
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          Call features
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "HD Voice",
              desc: "Crystal-clear audio",
              border: "border-emerald-500/25",
              title: "text-emerald-400",
            },
            {
              label: "HD Video",
              desc: "1080p video calls",
              border: "border-sky-500/25",
              title: "text-sky-400",
            },
            {
              label: "Screen Share",
              desc: "Share your screen",
              border: "border-violet-500/25",
              title: "text-violet-400",
            },
            {
              label: "Group Calls",
              desc: "Up to 20 participants",
              border: "border-cyan-500/25",
              title: "text-cyan-400",
            },
            {
              label: "In-Call Chat",
              desc: "Message during calls",
              border: "border-teal-500/25",
              title: "text-teal-400",
            },
            {
              label: "Session Recording",
              desc: "Record & replay calls",
              border: "border-rose-500/25",
              title: "text-rose-400",
            },
            {
              label: "Heavy media",
              desc: "Chunked uploads up to 2 GB",
              border: "border-fuchsia-500/25",
              title: "text-fuchsia-400",
            },
            {
              label: "E2E Encrypted",
              desc: "Secure communication",
              border: "border-rose-500/25",
              title: "text-rose-400",
            },
          ].map((feature) => (
            <div
              key={feature.label}
              className={`rounded-lg border bg-black/25 p-3 backdrop-blur-sm ${feature.border}`}
            >
              <p className={`text-sm font-medium ${feature.title}`}>{feature.label}</p>
              <p className="mt-0.5 text-xs text-cyan-200/40">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
