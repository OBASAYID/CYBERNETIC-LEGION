import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readHandoff } from "@shared/module-handoff";
import { systemFetch } from "@shared/cyrus-api-client";
import { useComms } from "../hooks/useComms";
import { usePresence } from "../contexts/PresenceContext";
import { Link, useLocation } from "wouter";
import {
  MessageSquare,
  Phone,
  Users,
  Activity,
  Sun,
  Moon,
  ArrowLeft,
  Smile,
  X,
  Radio,
  Share2,
} from "lucide-react";
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
import {
  fromSocketMessageSent,
  fromSocketNewMessage,
  mapServerMessageToComms,
} from "../lib/comms-message-map";

type MainTab = "chat" | "calls" | "people" | "streams" | "monitor" | "pshare";

function conversationPreviewLine(msg: {
  content: string;
  messageType?: string | null;
  fileUrl?: string | null;
  fileMimeType?: string | null;
}): string {
  const mt = (msg.messageType || "").toLowerCase();
  if (mt === "voice-note") return "🎤 Voice message";
  if (mt === "location") return "📍 Location";
  if (mt === "emoji") return msg.content || "Emoji";
  if (mt === "media" || msg.fileUrl) {
    const m = msg.fileMimeType || "";
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
  const [emojiTarget, setEmojiTarget] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [callChatMessages, setCallChatMessages] = useState<
    { senderId: string; senderName: string; message: string; timestamp: string }[]
  >([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [selectedConvForMessage, setSelectedConvForMessage] = useState<string | null>(null);
  const [callReactions, setCallReactions] = useState<Reaction[]>([]);
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
  } = usePresence();

  const myUserIdRef = useRef(myUserId);
  const myDeviceIdRef = useRef(myDeviceId);
  const displayNameRef = useRef(displayName);
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);
  useEffect(() => { myDeviceIdRef.current = myDeviceId; }, [myDeviceId]);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

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

  useEffect(() => {
    systemFetch("/api/comms/live-streams")
      .then(res => res.json())
      .then(data => {
        if (data.streams) {
          setLiveStreams(data.streams.map((s: any) => ({
            streamId: s.streamId,
            streamName: s.streamName,
            sourceType: s.sourceType,
            sourceUrl: s.sourceUrl,
            broadcasterId: s.broadcasterId,
            broadcasterName: s.broadcasterName,
            viewers: s.viewers || [],
            status: s.status,
            quality: s.quality || "720p",
            startTime: s.startTime,
            endTime: s.endTime,
          })));
        }
      })
      .catch(() => {});
  }, []);

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
    };

    const handleMessageSent = (data: {
      id: string;
      recipientId: string;
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
          recipientId: data.recipientId,
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
    };

    const handleCallChatMessage = (data: { senderId: string; senderName: string; message: string; timestamp: string }) => {
      setCallChatMessages(prev => [...prev, data]);
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

    socket.on("new-message", handleNewMessage);
    socket.on("message-sent", handleMessageSent);
    socket.on("typing-started", handleTypingStart);
    socket.on("typing-stopped", handleTypingStop);
    socket.on("call-chat-message", handleCallChatMessage);
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
      socket.off("reaction-received", handleReactionReceived);
      socket.off("call-quality-updated", handleCallQualityUpdated);
      socket.off("live-stream-started", handleLiveStreamStarted);
      socket.off("live-stream-ended", handleLiveStreamEnded);
      socket.off("stream-viewer-joined", handleStreamViewerJoined);
      socket.off("stream-viewer-left", handleStreamViewerLeft);
    };
  }, [wsRef.current]);

  const myId = myUserId || myDeviceId;

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
      profileImageUrl: liveProfile.get(u.id) ?? u.profileImageUrl ?? null,
      isOnline: on.has(u.id),
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
    (id: string) => avatarByUserId.get(id) ?? null,
    [avatarByUserId]
  );

  const handleChatAvatarUpload = useCallback(
    async (file: File) => {
      if (!myId) return;
      setAvatarUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await systemFetch("/api/comms/user/avatar", {
          method: "POST",
          body: fd,
          headers: { "X-User-Id": myId, "X-Device-Id": myId },
        });
        const data = await res.json();
        if (res.ok && data.profileImageUrl) {
          localStorage.setItem("cyrus-chat-avatar", data.profileImageUrl);
          setLocalChatAvatar(data.profileImageUrl);
          await queryClient.invalidateQueries({ queryKey: ["/api/comms/users/all"] });
        }
      } catch (e) {
        console.error("Avatar upload failed:", e);
      } finally {
        setAvatarUploading(false);
      }
    },
    [myId, queryClient]
  );

  useEffect(() => {
    if (localMessages.length > 0) {
      const timer = setTimeout(() => {
        setLocalMessages([]);
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [localMessages.length]);

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
      const partnerId = msg.senderId === myId ? msg.recipientId : msg.senderId;
      if (partnerId === "broadcast" || !partnerId) continue;
      const existing = convMap.get(partnerId);
      const partnerUser = allUsers.find(u => u.id === partnerId);
      const partnerOnline = onlineUsers.find(u => u.id === partnerId);
      const name = partnerUser?.displayName || partnerOnline?.displayName || partnerId.substring(0, 12) + "...";
      const isOnline = partnerUser?.isOnline || !!partnerOnline;

      if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessageTime)) {
        const unread = (existing?.unreadCount || 0) + (msg.senderId !== myId && !msg.read ? 1 : 0);
        convMap.set(partnerId, {
          id: partnerId,
          name,
          isGroup: false,
          lastMessage: conversationPreviewLine(msg),
          lastMessageTime: msg.timestamp,
          unreadCount: unread,
          isOnline,
        });
      }
    }

    if (pendingConversationId && !convMap.has(pendingConversationId)) {
      const partnerUser = allUsers.find(u => u.id === pendingConversationId);
      const partnerOnline = onlineUsers.find(u => u.id === pendingConversationId);
      const name = partnerUser?.displayName || partnerOnline?.displayName || pendingConversationId.substring(0, 12) + "...";
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

    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [messages, localMessages, myId, allUsers, onlineUsers, pendingConversationId]);

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
      const target = newChatPicks[0];
      setPendingConversationId(target);
      presenceSendChatMessage(target, { message: t, messageType: "text" });
      setNewChatMode(false);
      setNewChatPicks([]);
    },
    [newChatPicks, presenceSendChatMessage]
  );

  const handleSendMedia = useCallback(
    async (conversationId: string, file: File, caption: string) => {
      const formData = new FormData();
      formData.append("file", file);
      const uid = myUserId || myDeviceId;
      try {
        const res = await systemFetch("/api/comms/upload", {
          method: "POST",
          body: formData,
          headers: { "X-Device-Id": uid, "X-User-Id": uid },
        });
        if (res.ok) {
          const data = (await res.json()) as { fileUrl: string; fileName: string; mimeType?: string };
          presenceSendChatMessage(conversationId, {
            message: caption || " ",
            messageType: "media",
            fileUrl: data.fileUrl,
            fileName: data.fileName || file.name,
            fileMimeType: data.mimeType || file.type,
            fileSizeBytes: file.size,
          });
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    },
    [myUserId, myDeviceId, presenceSendChatMessage]
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
          headers: { "X-Device-Id": uid, "X-User-Id": uid },
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

  const handleTypingStart = useCallback((conversationId: string) => {
    wsRef.current?.emit("typing-start", { targetUserId: conversationId, conversationId });
  }, [wsRef]);

  const handleTypingStop = useCallback((conversationId: string) => {
    wsRef.current?.emit("typing-stop", { targetUserId: conversationId, conversationId });
  }, [wsRef]);

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
    // TODO: Group creation modal
  }, []);

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

  const handleUserMessage = useCallback((userId: string, userName: string) => {
    setSelectedConvForMessage(userId);
    setActiveTab("chat");
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
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      wsRef.current?.emit("screen-share-start", {
        roomId: activeCall?.roomId,
      });
      stream.getVideoTracks()[0].onended = () => {
        wsRef.current?.emit("screen-share-stop", { roomId: activeCall?.roomId });
      };
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  }, [wsRef, activeCall]);

  const handleScreenShareStop = useCallback(() => {
    wsRef.current?.emit("screen-share-stop", { roomId: activeCall?.roomId });
  }, [wsRef, activeCall]);

  const handleCallChatSend = useCallback((message: string) => {
    if (!activeCall?.roomId || !myUserId) return;
    wsRef.current?.emit("call-chat-message", {
      roomId: activeCall.roomId,
      message,
      timestamp: new Date().toISOString(),
    });
    setCallChatMessages(prev => [...prev, {
      senderId: myUserId,
      senderName: displayName,
      message,
      timestamp: new Date().toISOString(),
    }]);
  }, [wsRef, activeCall, myUserId, displayName]);

  const callParticipants: CallParticipant[] = activeCall
    ? [
        {
          id: activeCall.peerId,
          displayName: activeCall.peerName,
          stream: remoteStream || undefined,
          isMuted: false,
          isVideoEnabled: activeCall.callType === "video",
          connectionQuality: "good" as const,
        },
      ]
    : [];

  const tabConfig = [
    { id: "chat" as MainTab, icon: MessageSquare, label: "Chat" },
    { id: "pshare" as MainTab, icon: Share2, label: "Pshare" },
    { id: "calls" as MainTab, icon: Phone, label: "Calls" },
    { id: "people" as MainTab, icon: Users, label: "People" },
    { id: "streams" as MainTab, icon: Radio, label: "Streams" },
    { id: "monitor" as MainTab, icon: Activity, label: "Monitor" },
  ];

  const socialChannelTab = activeTab === "chat" || activeTab === "pshare";

  const themeClass = darkMode ? "" : "light-theme";

  return (
    <ModuleWorkspacePageShell mode="page">
    <div className={`flex h-screen min-h-0 flex-col ${themeClass}`}>
      {activeCall && activeCall.status === "connected" && (
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
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
          onStartScreenShare={handleScreenShareStart}
          onStopScreenShare={handleScreenShareStop}
          onSendChatMessage={handleCallChatSend}
          onSendReaction={handleSendReaction}
          onShareLocation={handleCallLocationShare}
          chatMessages={callChatMessages}
          reactions={callReactions}
          socketRef={wsRef}
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

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
          {commsHandoffText && (
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
          )}
          <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 bg-slate-950/50 pb-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:pb-0">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/">
                <button
                  type="button"
                  className="rounded-xl border border-white/12 bg-slate-950/55 p-2.5 text-white/85 transition hover:border-cyan-500/30 hover:text-white"
                  aria-label="Back to command center"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                <MessageSquare className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-cyan-200/60">Secure channels</p>
                <h1
                  className="bg-gradient-to-r from-cyan-100 via-white to-orange-200/90 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl"
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  NEXUS COMMS
                </h1>
                <p className="truncate text-[10px] font-mono text-cyan-100/50 sm:text-[11px]">
                  {isConnected ? "Connected" : "Connecting…"} · {onlineUsers.length} online
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:pl-2">
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-lg border border-white/10 bg-slate-950/40 p-2 text-white/60 transition hover:border-cyan-500/30 hover:text-cyan-200"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isConnected ? "animate-pulse bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-red-500"
                  }`}
                />
                <span className="max-w-[10rem] truncate font-mono text-[10px] text-emerald-100/90 sm:text-xs">
                  {displayName}
                </span>
              </div>
            </div>
          </header>

          <nav
            className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Comms modules"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/40 sm:sr-only">Channel</p>
            <div className="flex flex-1 flex-wrap justify-center gap-1 rounded-2xl border border-white/10 bg-slate-950/45 p-1 sm:justify-start">
              {tabConfig.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                    activeTab === tab.id
                      ? "border-cyan-400/50 bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 text-cyan-50 shadow-lg shadow-cyan-500/15"
                      : "border-white/10 bg-slate-950/50 text-white/65 hover:border-white/25 hover:text-white/90"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div
            className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-slate-950/60 p-1 ${
              socialChannelTab
                ? "border-amber-500/30 shadow-[0_0_70px_-18px_rgba(251,146,60,0.38),0_0_50px_-25px_rgba(34,211,238,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-cyan-500/20 shadow-[0_0_60px_-20px_rgba(34,211,238,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
            }`}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.1]"
              style={{
                backgroundImage:
                  socialChannelTab
                    ? "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.3) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(251, 191, 36, 0.22) 1px, transparent 0)"
                    : "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.35) 1px, transparent 0)",
                backgroundSize: socialChannelTab ? "22px 22px, 30px 30px" : "22px 22px",
                backgroundPosition: socialChannelTab ? "0 0, 11px 5px" : undefined,
              }}
            />
            <div
              className={`pointer-events-none absolute inset-0 ${
                socialChannelTab
                  ? "bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/8"
                  : "bg-gradient-to-br from-cyan-500/5 via-transparent to-orange-500/10"
              }`}
            />
            <div
              className={`absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${
                socialChannelTab ? "via-amber-400/50" : "via-cyan-400/50"
              }`}
            />
            <div
              className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent ${
                socialChannelTab ? "via-cyan-400/30" : "via-orange-500/35"
              }`}
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950/40 backdrop-blur-sm">
              {anomalyData?.anomalies && anomalyData.anomalies.length > 0 && !dismissedAnomalies && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/25 bg-amber-500/10 px-3 py-2 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
                    <span className="text-xs font-medium text-amber-200">
                      {anomalyData.anomalies.length} behavioral anomal{anomalyData.anomalies.length === 1 ? "y" : "ies"}{" "}
                      <span className="font-normal text-amber-100/60">· {anomalyData.anomalies[0]?.description}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedAnomalies(true)}
                    className="shrink-0 rounded-lg p-1 text-amber-300/80 transition hover:bg-amber-500/20 hover:text-amber-100"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-hidden p-1 sm:p-2">
                {activeTab === "chat" && (
                  <CommsPlatform
                    conversations={conversations}
                    messages={commsMessages}
                    currentUserId={myId}
                    typingUsers={typingUsers}
                    initialConversationId={pendingConversationId}
                    onSendMessage={handleSendMessage}
                    onSendMedia={handleSendMedia}
                    onSendVoice={handleSendVoice}
                    onSendLocation={handleSendLocation}
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
                )}

                {activeTab === "pshare" && (
                  <div className="h-full min-h-0">
                    <PsharePanel
                      myUserId={myId}
                      allUsers={allUsers}
                      highlightPostId={psharePostHighlight}
                      onClearHighlight={() => setPsharePostHighlight(null)}
                      initialPostBody={commsHandoffText}
                    />
                  </div>
                )}

                {activeTab === "people" && (
                  <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
                    <UserDiscovery
                      onlineUsers={onlineUsers}
                      allUsers={allUsers}
                      contacts={contacts}
                      myDeviceId={myDeviceId}
                      onMessage={handleUserMessage}
                      onCall={handleUserCall}
                      onAddContact={handleAddContact}
                      onRemoveContact={handleRemoveContact}
                    />
                  </div>
                )}

                {activeTab === "streams" && (
                  <div className="h-full min-h-0">
                    <LiveStreamPanel
                      streams={liveStreams}
                      currentUserId={myUserId || myDeviceId}
                      onStartStream={handleStartStream}
                      onEndStream={handleEndStream}
                      onJoinStream={handleJoinStream}
                      onLeaveStream={handleLeaveStream}
                    />
                  </div>
                )}

                {activeTab === "monitor" && (
                  <div className="h-full min-h-0 space-y-0 overflow-y-auto overscroll-contain">
                    <CommsIntelligence userId={myId} />
                    <AdminDashboard />
                  </div>
                )}

                {activeTab === "calls" && (
                  <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
                    <CallHistoryPanel
                      myDeviceId={myDeviceId}
                      allUsers={allUsers}
                      onlineUsers={onlineUsers}
                      onCall={handleUserCall}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </ModuleWorkspacePageShell>
  );
}

function CallHistoryPanel({
  myDeviceId,
  allUsers,
  onlineUsers,
  onCall,
}: {
  myDeviceId: string;
  allUsers: { id: string; displayName: string; isOnline: boolean; lastSeen: string | null; status: string }[];
  onlineUsers: { id: string; displayName: string; deviceId: string; inCall: boolean }[];
  onCall: (userId: string, userName: string, type: "audio" | "video") => void;
}) {
  const onlineOthers = onlineUsers.filter(u => u.id !== myDeviceId && u.id !== "cyrus-001");

  return (
    <div className="space-y-6">
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
            { label: "HD Voice", desc: "Crystal-clear audio", color: "emerald" },
            { label: "HD Video", desc: "1080p video calls", color: "blue" },
            { label: "Screen Share", desc: "Share your screen", color: "purple" },
            { label: "Group Calls", desc: "Up to 20 participants", color: "amber" },
            { label: "In-Call Chat", desc: "Message during calls", color: "cyan" },
            { label: "E2E Encrypted", desc: "Secure communication", color: "red" },
          ].map((feature) => (
            <div
              key={feature.label}
              className={`p-3 rounded-lg bg-gray-900/40 border border-${feature.color}-900/20`}
            >
              <p className={`text-sm font-medium text-${feature.color}-400`}>{feature.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
