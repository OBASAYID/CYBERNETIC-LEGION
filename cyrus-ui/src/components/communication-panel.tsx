import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  Send,
  Users,
  MessageSquare,
  X,
  WifiOff,
  SignalHigh,
  SignalMedium,
  SignalLow,
  RefreshCw,
  Volume2,
  Maximize2,
  Minimize2,
  PhoneIncoming,
  Radio,
  Zap,
  Shield,
  Activity,
  Monitor,
  MonitorOff,
  Circle,
  Square,
  Download,
  Clock,
  History,
  Cpu,
  Wifi,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import {
  webRTCService,
  OnlineUser,
  ChatMessage,
  ConnectionStats,
  CallHistoryEntry,
  GROUP_CALL_MAX_MEMBERS,
  type GroupInvitePayload,
} from "@/lib/webrtc-service";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { probeCyrusConnectivity } from "@/lib/cyrus-comm-connectivity";

interface CommunicationPanelProps {
  operatorName?: string;
  operatorId?: string;
  isAuthenticated: boolean;
}

// ─── Quality helpers ──────────────────────────────────────────────────────────

function QualityIcon({ quality }: { quality: string }) {
  switch (quality) {
    case "excellent": return <SignalHigh className="w-4 h-4 text-green-400" />;
    case "good":      return <SignalMedium className="w-4 h-4 text-green-400" />;
    case "fair":      return <SignalMedium className="w-4 h-4 text-yellow-400" />;
    case "poor":      return <SignalLow className="w-4 h-4 text-red-400" />;
    default:          return <Radio className="w-4 h-4 text-blue-400 animate-pulse" />;
  }
}

function qualityLabel(q: string) {
  return q.toUpperCase();
}

function qualityColor(q: string) {
  switch (q) {
    case "excellent": return "text-green-400";
    case "good":      return "text-green-400";
    case "fair":      return "text-yellow-400";
    case "poor":      return "text-red-400";
    default:          return "text-blue-400";
  }
}

function mosColor(mos: number) {
  if (mos >= 4) return "text-green-400";
  if (mos >= 3) return "text-yellow-400";
  return "text-red-400";
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatHistoryDuration(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

// ─── Audio Level Visualiser ───────────────────────────────────────────────────

function AudioLevelBar({ level }: { level: number }) {
  const bars = 12;
  return (
    <div className="flex items-end gap-0.5 h-6">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i / bars) * 100;
        const active = level > threshold;
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              active
                ? i < bars * 0.6
                  ? "bg-green-400"
                  : i < bars * 0.85
                  ? "bg-yellow-400"
                  : "bg-red-400"
                : "bg-muted-foreground/20"
            }`}
            style={{ height: `${((i + 1) / bars) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

function RemotePeerVideo({ stream, label }: { stream: MediaStream; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [stream]);
  return (
    <div className="relative rounded-lg overflow-hidden border border-white/15 bg-slate-900 aspect-video">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-white/90 truncate">
        {label}
      </div>
    </div>
  );
}

// ─── Network Stats Panel ──────────────────────────────────────────────────────

function NetworkStatsPanel({ stats }: { stats: ConnectionStats | null }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Audio</span>
          <span className="text-green-400">{stats.audioBitrate} kbps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Video</span>
          <span className="text-blue-400">{stats.videoBitrate} kbps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">RTT</span>
          <span className={stats.roundTripTime > 150 ? "text-red-400" : "text-green-400"}>
            {stats.roundTripTime}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Jitter</span>
          <span className={stats.jitter > 30 ? "text-yellow-400" : "text-green-400"}>
            {stats.jitter}ms
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Loss</span>
          <span className={stats.packetLossPercent > 5 ? "text-red-400" : "text-green-400"}>
            {stats.packetLossPercent}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">MOS</span>
          <span className={mosColor(stats.mosScore)}>{stats.mosScore.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Res</span>
          <span className="text-foreground">{stats.resolution}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">FPS</span>
          <span className="text-foreground">{stats.frameRate}</span>
        </div>
      </div>
      <div className="col-span-2 flex justify-between border-t pt-1 mt-1">
        <span className="text-muted-foreground">Codec</span>
        <span className="text-foreground">{stats.audioCodec} / {stats.videoCodec}</span>
      </div>
      <div className="col-span-2 flex justify-between">
        <span className="text-muted-foreground">Network</span>
        <span className="text-foreground capitalize">{stats.networkType}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommunicationPanel({
  operatorName = "Operator",
  operatorId,
  isAuthenticated
}: CommunicationPanelProps) {
  const { toast } = useToast();

  // ── Connection state ──────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // ── Users & chat ──────────────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");

  // ── Call state ────────────────────────────────────────────────────────────
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    from: string; callerName: string; callType: "voice" | "video";
  } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallConnecting, setIsCallConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<
    "excellent" | "good" | "fair" | "poor" | "connecting"
  >("connecting");

  // ── Advanced features ─────────────────────────────────────────────────────
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveStats, setLiveStats] = useState<ConnectionStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);

  // ── Group call (mesh, up to GROUP_CALL_MAX_MEMBERS) ───────────────────────
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [incomingGroupInvite, setIncomingGroupInvite] = useState<(GroupInvitePayload & { from: string }) | null>(null);
  const [groupRemoteStreams, setGroupRemoteStreams] = useState<Map<string, MediaStream>>(() => new Map());
  const [groupSelectMode, setGroupSelectMode] = useState(false);
  const [groupSelectedIds, setGroupSelectedIds] = useState<Set<string>>(() => new Set());
  const [connectivityProbeRunning, setConnectivityProbeRunning] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"users" | "chat" | "history">("users");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Stable user ID ────────────────────────────────────────────────────────
  const getStableUserId = useCallback(() => {
    if (operatorId && operatorId !== "null") return operatorId;
    let stableId = localStorage.getItem("cyrus_comm_user_id");
    if (!stableId) {
      stableId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("cyrus_comm_user_id", stableId);
    }
    return stableId;
  }, [operatorId]);

  // ── Status helpers ─────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":  return "bg-green-500";
      case "busy":    return "bg-yellow-500";
      case "in_call": return "bg-red-500";
      default:        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":  return "ONLINE";
      case "busy":    return "BUSY";
      case "in_call": return "IN CALL";
      default:        return "OFFLINE";
    }
  };

  // ── Auto-hide controls in fullscreen ──────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isFullscreen) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isFullscreen]);

  // ── Connect to signaling server ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const userId = getStableUserId();
    const userName = operatorName || "Operator";

    try {
      const q = new URLSearchParams(window.location.search);
      const link = q.get("commLink");
      if (link === "satellite" || link === "ntn") {
        webRTCService.setCommLinkProfile("satellite");
      }
    } catch {
      /* ignore */
    }

    webRTCService.connect(userId, userName)
      .then(() => {
        setIsConnected(true);
        setIsReconnecting(false);
        setCallHistory(webRTCService.getCallHistory());
        toast({ title: "CYRUS COMMS Online", description: "Secure channel established" });
      })
      .catch(() => {
        toast({ title: "Connection Failed", description: "Could not establish secure channel", variant: "destructive" });
      });

    webRTCService.setOnUserList(users => setOnlineUsers(users.filter(u => u.id !== userId)));
    webRTCService.setOnMessage(msg => setMessages(prev => [...prev, msg]));

    webRTCService.setOnIncomingCall(data => {
      setIncomingCall(data);
      toast({ title: "Incoming Transmission", description: `${data.callerName} requesting ${data.callType} link` });
    });

    webRTCService.setOnIncomingGroupInvite(d => {
      setIncomingGroupInvite(d);
      toast({
        title: "Group invitation",
        description: `${d.hostName} · ${d.memberIds.length} participants (${d.callType})`,
      });
    });

    webRTCService.setOnGroupRemoteStream((peerId, stream) => {
      setGroupRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(peerId, stream);
        return next;
      });
      setIsCallConnecting(false);
    });

    webRTCService.setOnCallResponse(data => {
      if (data.accepted) {
        setIsCallConnecting(true);
        toast({ title: "Link Accepted", description: "Establishing secure connection…" });
      } else {
        toast({ title: "Link Declined", description: data.reason || "Connection request denied", variant: "destructive" });
        setIsInCall(false);
        setCallType(null);
        setIsCallConnecting(false);
      }
    });

    webRTCService.setOnCallEnd(() => {
      endCall(false);
      setCallHistory(webRTCService.getCallHistory());
      toast({ title: "Transmission Ended", description: "Secure channel closed" });
    });

    webRTCService.setOnRemoteStream(stream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
      setIsCallConnecting(false);
    });

    webRTCService.setOnLocalStream(stream => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    });

    webRTCService.setOnConnectionQuality(q => setConnectionQuality(q));
    webRTCService.setOnStats(s => setLiveStats(s));
    webRTCService.setOnAudioLevel(l => setAudioLevel(l));

    webRTCService.setOnScreenShare(stream => setIsScreenSharing(stream !== null));

    webRTCService.setOnRecording((state, blob) => {
      setIsRecording(state === "started");
      if (state === "stopped" && blob) {
        // Auto-download recording
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cyrus-call-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Recording Saved", description: "Call recording downloaded" });
      }
    });

    webRTCService.setOnReconnecting(attempt => {
      setIsReconnecting(true);
      setReconnectAttempt(attempt);
      toast({ title: "Reconnecting", description: `Attempt ${attempt}/10…` });
    });

    webRTCService.setOnReconnected(() => {
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setIsConnected(true);
      toast({ title: "Reconnected", description: "Secure channel restored" });
    });

    webRTCService.setOnDisconnected(() => setIsConnected(false));

    return () => {
      webRTCService.disconnect();
      setIsConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, operatorName]);

  // ── Scroll messages ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Call timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isInCall && !isCallConnecting) {
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [isInCall, isCallConnecting]);

  // ── Fullscreen change ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Controls auto-hide ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    }
  }, [isFullscreen]);

  // ── Call actions ───────────────────────────────────────────────────────────
  const startCall = async (user: OnlineUser, type: "voice" | "video") => {
    if (webRTCService.isInGroupCall()) {
      toast({ title: "In a group call", description: "End the group session before starting a direct call.", variant: "destructive" });
      return;
    }
    setIsGroupCall(false);
    setSelectedUser(user);
    setCallType(type);
    setIsInCall(true);
    setIsCallConnecting(true);
    setConnectionQuality("connecting");
    setLiveStats(null);
    await webRTCService.startCall(user.id, user.name, type);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    if (webRTCService.isInGroupCall()) {
      toast({ title: "In a group call", description: "End the group session first.", variant: "destructive" });
      return;
    }

    setIsGroupCall(false);
    setCallType(incomingCall.callType);
    setIsInCall(true);
    setIsCallConnecting(true);
    setConnectionQuality("connecting");
    setLiveStats(null);

    const callerUser = onlineUsers.find(u => u.id === incomingCall.from) ?? {
      id: incomingCall.from,
      name: incomingCall.callerName,
      deviceId: "unknown",
      status: "in_call" as const,
      lastSeen: Date.now()
    };
    setSelectedUser(callerUser);

    try {
      await webRTCService.acceptCall(incomingCall.from, incomingCall.callerName, incomingCall.callType);
    } catch {
      toast({ title: "Connection Failed", description: "Could not access camera/microphone", variant: "destructive" });
      setIsInCall(false);
      setCallType(null);
      setIsCallConnecting(false);
    }

    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (incomingCall) {
      webRTCService.rejectCall(incomingCall.from);
      setIncomingCall(null);
    }
  };

  const endCall = useCallback((sendSignal: boolean = true) => {
    webRTCService.endCall(sendSignal);
    setIsGroupCall(false);
    setGroupRemoteStreams(new Map());
    setIsInCall(false);
    setCallType(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsCallConnecting(false);
    setConnectionQuality("connecting");
    setLiveStats(null);
    setIsScreenSharing(false);
    setIsRecording(false);
    setAudioLevel(0);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (isFullscreen && document.fullscreenElement) document.exitFullscreen();
  }, [isFullscreen]);

  const toggleGroupMember = (userId: string) => {
    setGroupSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else {
        if (next.size >= GROUP_CALL_MAX_MEMBERS - 1) {
          toast({
            title: "Group size limit",
            description: `You can add at most ${GROUP_CALL_MAX_MEMBERS - 1} other people (${GROUP_CALL_MAX_MEMBERS} including you).`,
            variant: "destructive",
          });
          return prev;
        }
        next.add(userId);
      }
      return next;
    });
  };

  const startGroupCall = async (type: "voice" | "video") => {
    const members = onlineUsers.filter(u => groupSelectedIds.has(u.id) && u.status !== "in_call");
    if (members.length === 0) {
      toast({
        title: "Select participants",
        description: "Choose at least one available device for a group call.",
        variant: "destructive",
      });
      return;
    }
    setIsGroupCall(true);
    setCallType(type);
    setIsInCall(true);
    setIsCallConnecting(true);
    setConnectionQuality("connecting");
    setLiveStats(null);
    setGroupRemoteStreams(new Map());
    setSelectedUser(members[0]);
    try {
      await webRTCService.startGroupCall(
        members.map(u => ({ id: u.id, name: u.name })),
        type,
      );
      setGroupSelectMode(false);
      setGroupSelectedIds(new Set());
      setIsCallConnecting(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start group call";
      toast({ title: "Group call failed", description: msg, variant: "destructive" });
      endCall(false);
    }
  };

  const acceptGroupInvite = async () => {
    if (!incomingGroupInvite) return;
    const inv = incomingGroupInvite;
    setIncomingGroupInvite(null);
    setIsGroupCall(true);
    setCallType(inv.callType);
    setIsInCall(true);
    setIsCallConnecting(true);
    setConnectionQuality("connecting");
    setLiveStats(null);
    setGroupRemoteStreams(new Map());
    const hostUser =
      onlineUsers.find(u => u.id === inv.from) ?? {
        id: inv.from,
        name: inv.hostName,
        deviceId: "unknown",
        status: "online" as const,
        lastSeen: Date.now(),
      };
    setSelectedUser(hostUser);
    try {
      await webRTCService.acceptGroupInvite(inv);
      setIsCallConnecting(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not join group call";
      toast({ title: "Group call failed", description: msg, variant: "destructive" });
      endCall(false);
    }
  };

  const rejectGroupInvite = () => {
    if (!incomingGroupInvite) return;
    webRTCService.rejectGroupInvite(incomingGroupInvite.from, incomingGroupInvite);
    setIncomingGroupInvite(null);
  };

  const peerDisplayName = useCallback(
    (id: string) => onlineUsers.find(u => u.id === id)?.name ?? id.slice(0, 8),
    [onlineUsers],
  );

  const runConnectivityProbe = async () => {
    setConnectivityProbeRunning(true);
    try {
      const r = await probeCyrusConnectivity();
      const port = r.stack?.fused?.livePort;
      const origin = r.stack?.fused?.liveOrigin;
      const stackHint =
        port != null ? `API/stack port ${port}${origin ? ` · ${origin}` : ""}` : "";
      toast({
        title: r.httpOk && r.wsOk ? "Connectivity OK" : "Connectivity issue",
        description: [
          `HTTP ${r.httpOk ? "OK" : "fail"}${r.httpStatus != null ? ` (${r.httpStatus})` : ""}`,
          `WebSocket ${r.wsOk ? "OK" : r.wsError || "fail"}`,
          `${r.elapsedMs} ms`,
          stackHint,
        ]
          .filter(Boolean)
          .join(" · "),
        variant: r.httpOk && r.wsOk ? "default" : "destructive",
      });
    } finally {
      setConnectivityProbeRunning(false);
    }
  };

  const toggleMute = () => setIsMuted(webRTCService.toggleMute());
  const toggleVideo = () => setIsVideoOff(webRTCService.toggleVideo());

  const toggleFullscreen = async () => {
    if (!callContainerRef.current) return;
    if (!document.fullscreenElement) {
      await callContainerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await webRTCService.stopScreenShare();
    } else {
      const stream = await webRTCService.startScreenShare();
      if (!stream) toast({ title: "Screen Share Failed", description: "Could not access screen", variant: "destructive" });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      webRTCService.stopRecording();
    } else {
      const started = webRTCService.startRecording();
      if (!started) toast({ title: "Recording Failed", description: "Could not start recording", variant: "destructive" });
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedUser) return;
    webRTCService.sendTextMessage(selectedUser.id, messageInput.trim());
    setMessages(prev => [...prev, {
      from: operatorId || "",
      to: selectedUser.id,
      text: messageInput.trim(),
      timestamp: Date.now(),
      isOwn: true
    }]);
    setMessageInput("");
  };

  const selectUserForChat = (user: OnlineUser) => {
    setSelectedUser(user);
    setActiveTab("chat");
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="relative">
              <Shield className="w-16 h-16 opacity-30" />
              <WifiOff className="w-8 h-8 absolute bottom-0 right-0 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">AUTHENTICATION REQUIRED</p>
              <p className="text-sm mt-1">Verify identity to access secure communication channels</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* ── Status Bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-gradient-to-r from-background via-muted/30 to-background p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} ${isReconnecting ? "animate-pulse" : ""}`} />
              {isConnected && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-50" />}
            </div>

            {isReconnecting ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />
                <span className="text-sm font-mono text-yellow-500">RECONNECTING ({reconnectAttempt}/10)</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-sm font-mono text-green-500">CYRUS COMMS ACTIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm font-mono text-red-500">DISCONNECTED</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={connectivityProbeRunning}
                  onClick={() => void runConnectivityProbe()}
                  data-testid="button-connectivity-probe"
                  aria-label="Check API and WebSocket signaling"
                >
                  <Wifi className={`h-4 w-4 ${connectivityProbeRunning ? "animate-pulse" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Run HTTP (`/api/stack/ports`) + WebSocket probe (`/ws?probe=1`) — verifies API reachability and
                that signaling upgrades are not blocked by a proxy.
              </TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <Users className="w-3 h-3" />
              {onlineUsers.length} DEVICE{onlineUsers.length !== 1 ? "S" : ""}
            </Badge>
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <Activity className="w-3 h-3 text-green-400" />
              E2E ENCRYPTED
            </Badge>
          </div>
        </div>

        {/* ── Incoming Call ───────────────────────────────────────────────── */}
        {incomingCall && (
          <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse pointer-events-none" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-primary">
                      <AvatarFallback className="text-2xl font-bold bg-primary/20">
                        {incomingCall.callerName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <PhoneIncoming className="w-6 h-6 text-primary animate-bounce" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-xl">{incomingCall.callerName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {incomingCall.callType === "video"
                          ? <><Video className="w-3 h-3 mr-1" /> VIDEO LINK</>
                          : <><Phone className="w-3 h-3 mr-1" /> VOICE LINK</>}
                      </Badge>
                      <span className="text-sm text-muted-foreground animate-pulse">Incoming…</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button size="lg" variant="destructive" onClick={rejectCall}
                    className="rounded-full w-14 h-14" data-testid="button-reject-call">
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                  <Button size="lg" onClick={acceptCall}
                    className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700" data-testid="button-accept-call">
                    <Phone className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Incoming group invite ───────────────────────────────────────── */}
        {incomingGroupInvite && (
          <Card className="border-2 border-violet-500/60 bg-gradient-to-br from-violet-500/10 via-background to-violet-500/5 overflow-hidden relative">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-violet-500/50">
                      <AvatarFallback className="text-2xl font-bold bg-violet-500/20">
                        {incomingGroupInvite.hostName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <Users className="w-6 h-6 text-violet-400" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-xl">{incomingGroupInvite.hostName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {incomingGroupInvite.callType === "video" ? (
                          <><Video className="w-3 h-3 mr-1" /> GROUP VIDEO</>
                        ) : (
                          <><Phone className="w-3 h-3 mr-1" /> GROUP VOICE</>
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {incomingGroupInvite.memberIds.length} participants (max {GROUP_CALL_MAX_MEMBERS})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button size="lg" variant="destructive" onClick={rejectGroupInvite}
                    className="rounded-full w-14 h-14" data-testid="button-reject-group-invite">
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                  <Button size="lg" onClick={() => void acceptGroupInvite()}
                    className="rounded-full w-14 h-14 bg-violet-600 hover:bg-violet-700" data-testid="button-accept-group-invite">
                    <Phone className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Active Call UI ──────────────────────────────────────────────── */}
        {isInCall && (
          <Card
            ref={callContainerRef}
            className={`overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}
            onMouseMove={resetControlsTimer}
          >
            <CardContent className={`p-0 ${isFullscreen ? "h-screen" : ""}`}>
              <div className={`relative ${callType === "video" ? (isFullscreen ? "h-full" : "aspect-video") : "py-16"} bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`}>

                {/* ── Video feeds ─────────────────────────────────────────── */}
                {callType === "video" && !isGroupCall && (
                  <>
                    <video ref={remoteVideoRef} autoPlay playsInline
                      className="absolute inset-0 w-full h-full object-cover" data-testid="video-remote" />

                    {/* Connecting overlay */}
                    {isCallConnecting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                        <div className="text-center">
                          <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
                            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                            <Radio className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
                          </div>
                          <p className="text-lg font-mono text-primary">ESTABLISHING SECURE LINK</p>
                          <p className="text-sm text-muted-foreground mt-2">Encrypting connection…</p>
                        </div>
                      </div>
                    )}

                    {/* Screen share indicator */}
                    {isScreenSharing && (
                      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
                        <Badge className="bg-blue-600 text-white font-mono gap-1 animate-pulse">
                          <Monitor className="w-3 h-3" /> SCREEN SHARING
                        </Badge>
                      </div>
                    )}

                    {/* Local PIP */}
                    <div className="absolute bottom-24 right-4 w-44 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 z-10">
                      <video ref={localVideoRef} autoPlay playsInline muted
                        className="w-full h-full object-cover scale-x-[-1]" data-testid="video-local" />
                      {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                          <VideoOff className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {callType === "video" && isGroupCall && (
                  <>
                    <div className="absolute inset-0 z-0 p-2 pb-36 overflow-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Array.from(groupRemoteStreams.entries()).map(([id, stream]) => (
                          <RemotePeerVideo key={id} stream={stream} label={peerDisplayName(id)} />
                        ))}
                      </div>
                    </div>
                    {isCallConnecting && groupRemoteStreams.size === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                        <div className="text-center">
                          <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-violet-500/30 rounded-full" />
                            <div className="absolute inset-0 border-4 border-transparent border-t-violet-400 rounded-full animate-spin" />
                            <Users className="absolute inset-0 m-auto w-10 h-10 text-violet-400 animate-pulse" />
                          </div>
                          <p className="text-lg font-mono text-violet-300">GROUP VIDEO</p>
                          <p className="text-sm text-muted-foreground mt-2">Waiting for participants…</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-24 right-4 w-44 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 z-10">
                      <video ref={localVideoRef} autoPlay playsInline muted
                        className="w-full h-full object-cover scale-x-[-1]" data-testid="video-local-group" />
                      {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                          <VideoOff className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Voice call UI ────────────────────────────────────────── */}
                {callType === "voice" && !isGroupCall && (
                  <div className="flex flex-col items-center justify-center py-8 relative z-10">
                    {/* Animated waveform background */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                      <div className="flex gap-1 items-end">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className="w-1 bg-primary rounded-full animate-pulse"
                            style={{
                              height: `${20 + (audioLevel / 100) * 60 * Math.sin((i / 24) * Math.PI)}px`,
                              animationDelay: `${i * 0.05}s`,
                              animationDuration: `${0.4 + (i % 3) * 0.2}s`
                            }} />
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <Avatar className="w-32 h-32 border-4 border-primary/50">
                        <AvatarFallback className="text-5xl font-bold bg-gradient-to-br from-primary/30 to-primary/10">
                          {selectedUser?.name[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      {!isCallConnecting && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    <p className="mt-6 font-bold text-2xl text-white">{selectedUser?.name}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <QualityIcon quality={connectionQuality} />
                      <span className={`text-sm font-mono ${qualityColor(connectionQuality)}`}>
                        {qualityLabel(connectionQuality)}
                      </span>
                    </div>

                    {/* Audio level meter */}
                    {!isCallConnecting && !isMuted && (
                      <div className="mt-4">
                        <AudioLevelBar level={audioLevel} />
                      </div>
                    )}

                    {isCallConnecting && (
                      <div className="mt-4 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-sm text-primary animate-pulse">Connecting…</span>
                      </div>
                    )}
                  </div>
                )}

                {callType === "voice" && isGroupCall && (
                  <div className="flex flex-col items-center justify-center py-8 relative z-10 px-4">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                      <Users className="w-40 h-40 text-violet-400" />
                    </div>
                    <Badge variant="secondary" className="mb-4 font-mono bg-violet-600/40 text-white border-violet-400/40">
                      GROUP VOICE · {groupRemoteStreams.size + 1} ON LINK
                    </Badge>
                    <div className="flex flex-wrap justify-center gap-4 max-w-lg">
                      <div className="flex flex-col items-center gap-1">
                        <Avatar className="w-14 h-14 border-2 border-white/30">
                          <AvatarFallback className="text-lg">You</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/70 font-mono">You</span>
                      </div>
                      {Array.from(groupRemoteStreams.keys()).map(id => (
                        <div key={id} className="flex flex-col items-center gap-1">
                          <Avatar className="w-14 h-14 border-2 border-violet-400/50">
                            <AvatarFallback className="text-lg bg-violet-900/40">
                              {peerDisplayName(id)[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-white/80 font-mono truncate max-w-[88px]">{peerDisplayName(id)}</span>
                        </div>
                      ))}
                    </div>
                    {!isCallConnecting && !isMuted && (
                      <div className="mt-6">
                        <AudioLevelBar level={audioLevel} />
                      </div>
                    )}
                    {isCallConnecting && groupRemoteStreams.size === 0 && (
                      <div className="mt-6 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-violet-400 animate-pulse" />
                        <span className="text-sm text-violet-300 animate-pulse">Connecting…</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Top HUD ──────────────────────────────────────────────── */}
                <div className={`absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm font-mono text-xs">
                      <Shield className="w-3 h-3 mr-1 text-green-400" />
                      E2E ENCRYPTED
                    </Badge>

                    {isGroupCall && (
                      <Badge variant="secondary" className="bg-violet-700/70 backdrop-blur-sm font-mono text-xs gap-1">
                        <Users className="w-3 h-3" />
                        GROUP · {GROUP_CALL_MAX_MEMBERS} MAX
                      </Badge>
                    )}

                    <Badge variant="secondary" className={`bg-black/60 backdrop-blur-sm font-mono text-xs gap-1 ${qualityColor(connectionQuality)}`}>
                      <QualityIcon quality={connectionQuality} />
                      {qualityLabel(connectionQuality)}
                    </Badge>

                    {liveStats && (
                      <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm font-mono text-xs">
                        MOS {liveStats.mosScore.toFixed(1)}
                      </Badge>
                    )}

                    {isRecording && (
                      <Badge className="bg-red-600 text-white font-mono text-xs gap-1 animate-pulse">
                        <Circle className="w-2 h-2 fill-current" /> REC
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white text-base tabular-nums bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg">
                      <Clock className="w-3 h-3 inline mr-1 opacity-70" />
                      {formatDuration(callDuration)}
                    </span>

                    {/* Stats toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={() => setShowStats(p => !p)}
                          className="text-white hover:bg-white/20 w-8 h-8">
                          <Info className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Network stats</TooltipContent>
                    </Tooltip>

                    <Button size="icon" variant="ghost" onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20 w-8 h-8" data-testid="button-fullscreen">
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* ── Network stats overlay ─────────────────────────────────── */}
                {showStats && liveStats && (
                  <div className="absolute top-16 right-4 z-20 bg-black/80 backdrop-blur-sm rounded-xl p-3 w-56 border border-white/10">
                    <p className="text-xs font-mono text-muted-foreground mb-2 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> NETWORK DIAGNOSTICS
                    </p>
                    <NetworkStatsPanel stats={liveStats} />
                  </div>
                )}

                {/* ── Bottom controls ───────────────────────────────────────── */}
                <div className={`absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>

                  {/* Audio level (voice calls) */}
                  {callType === "voice" && !isMuted && (
                    <div className="flex justify-center mb-3">
                      <AudioLevelBar level={audioLevel} />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3">
                    {/* Mute */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="lg" variant={isMuted ? "destructive" : "secondary"} onClick={toggleMute}
                          className="rounded-full w-13 h-13 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-0"
                          data-testid="button-toggle-mute">
                          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                    </Tooltip>

                    {/* Video toggle */}
                    {callType === "video" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="lg" variant={isVideoOff ? "destructive" : "secondary"} onClick={toggleVideo}
                            className="rounded-full w-13 h-13 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-0"
                            data-testid="button-toggle-video">
                            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isVideoOff ? "Start video" : "Stop video"}</TooltipContent>
                      </Tooltip>
                    )}

                    {/* Screen share (1:1 only — mesh group uses per-peer tracks) */}
                    {callType === "video" && !isGroupCall && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="lg" variant={isScreenSharing ? "default" : "secondary"} onClick={toggleScreenShare}
                            className={`rounded-full w-13 h-13 backdrop-blur-sm border-0 ${isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-white/10 hover:bg-white/20"}`}
                            data-testid="button-screen-share">
                            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isScreenSharing ? "Stop sharing" : "Share screen"}</TooltipContent>
                      </Tooltip>
                    )}

                    {/* Record (1:1 only) */}
                    {!isGroupCall && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="lg" variant={isRecording ? "destructive" : "secondary"} onClick={toggleRecording}
                            className={`rounded-full w-13 h-13 backdrop-blur-sm border-0 ${isRecording ? "" : "bg-white/10 hover:bg-white/20"}`}
                            data-testid="button-record">
                            {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isRecording ? "Stop recording" : "Record call"}</TooltipContent>
                      </Tooltip>
                    )}

                    {/* End call */}
                    <Button size="lg" variant="destructive" onClick={() => endCall(true)}
                      className="rounded-full w-16 h-16 shadow-lg shadow-red-500/30"
                      data-testid="button-end-call">
                      <PhoneOff className="w-7 h-7" />
                    </Button>
                  </div>

                  {/* Participant info */}
                  <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                    {isGroupCall ? (
                      <>
                        <Users className="w-4 h-4 text-violet-300" />
                        <span className="text-white/70 text-xs font-mono">
                          Group · {groupRemoteStreams.size + 1} on link
                        </span>
                      </>
                    ) : (
                      <>
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-xs">{selectedUser?.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-white/70 text-xs font-mono">{selectedUser?.name}</span>
                      </>
                    )}
                    {liveStats && (
                      <span className={`text-xs font-mono ${qualityColor(liveStats.quality)}`}>
                        · {liveStats.roundTripTime}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Main Panel (not in call) ────────────────────────────────────── */}
        {!isInCall && (
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Button variant={activeTab === "users" ? "default" : "outline"} size="sm"
                  onClick={() => setActiveTab("users")} className="gap-1" data-testid="button-tab-users">
                  <Users className="w-4 h-4" />
                  Devices
                </Button>
                <Button variant={activeTab === "chat" ? "default" : "outline"} size="sm"
                  onClick={() => setActiveTab("chat")} disabled={!selectedUser}
                  className="gap-1" data-testid="button-tab-chat">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </Button>
                <Button variant={activeTab === "history" ? "default" : "outline"} size="sm"
                  onClick={() => setActiveTab("history")} className="gap-1" data-testid="button-tab-history">
                  <History className="w-4 h-4" />
                  History
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4">

              {/* ── Devices tab ─────────────────────────────────────────── */}
              {activeTab === "users" && (
                <div className="space-y-2">
                  {onlineUsers.length > 0 && (
                    <div className="rounded-xl border bg-gradient-to-r from-violet-500/10 to-transparent p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Group call</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Up to {GROUP_CALL_MAX_MEMBERS} people total. Select participants, then start group voice or video.
                          </p>
                        </div>
                        <Button
                          variant={groupSelectMode ? "default" : "outline"}
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setGroupSelectMode(v => {
                              if (v) setGroupSelectedIds(new Set());
                              return !v;
                            });
                          }}
                          data-testid="button-toggle-group-select"
                        >
                          {groupSelectMode ? "Cancel selection" : "Select group participants"}
                        </Button>
                      </div>
                      {groupSelectMode && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            Selected: {groupSelectedIds.size} / {GROUP_CALL_MAX_MEMBERS - 1}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={groupSelectedIds.size === 0}
                            onClick={() => void startGroupCall("voice")}
                            className="gap-1"
                            data-testid="button-start-group-voice"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Group voice
                          </Button>
                          <Button
                            size="sm"
                            disabled={groupSelectedIds.size === 0}
                            onClick={() => void startGroupCall("video")}
                            className="gap-1 bg-violet-600 hover:bg-violet-700"
                            data-testid="button-start-group-video"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Group video
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {onlineUsers.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                        <Radio className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">No Devices Detected</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          Open CYRUS on another device to establish connection
                        </p>
                      </div>
                    </div>
                  ) : (
                    onlineUsers.map(user => (
                      <div key={user.id}
                        className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-muted/30 to-transparent hover-elevate transition-all">
                        <div className="flex items-center gap-4">
                          {groupSelectMode && (
                            <Checkbox
                              checked={groupSelectedIds.has(user.id)}
                              onCheckedChange={() => toggleGroupMember(user.id)}
                              disabled={user.status === "in_call"}
                              aria-label={`Include ${user.name} in group call`}
                              data-testid={`checkbox-group-${user.id}`}
                            />
                          )}
                          <div className="relative">
                            <Avatar className="w-12 h-12 border-2 border-muted">
                              <AvatarFallback className="font-bold">{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(user.status)}`} />
                          </div>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs font-mono">
                                {getStatusText(user.status)}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {user.deviceId.slice(0, 12)}…
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => selectUserForChat(user)}
                                disabled={user.status === "in_call"} className="rounded-full"
                                data-testid={`button-chat-${user.id}`}>
                                <MessageSquare className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Message</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => startCall(user, "voice")}
                                disabled={user.status === "in_call" || groupSelectMode}
                                className="rounded-full text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                                data-testid={`button-voice-call-${user.id}`}>
                                <Phone className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Voice call</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => startCall(user, "video")}
                                disabled={user.status === "in_call" || groupSelectMode}
                                className="rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                data-testid={`button-video-call-${user.id}`}>
                                <Video className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Video call</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Chat tab ─────────────────────────────────────────────── */}
              {activeTab === "chat" && selectedUser && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{selectedUser.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-semibold">{selectedUser.name}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(selectedUser.status)}`} />
                          <span className="text-xs text-muted-foreground">{getStatusText(selectedUser.status)}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost"
                      onClick={() => { setSelectedUser(null); setActiveTab("users"); }}
                      data-testid="button-close-chat">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <ScrollArea className="h-72 border rounded-xl p-4 bg-muted/10">
                    <div className="space-y-3">
                      {messages
                        .filter(m =>
                          (m.from === selectedUser.id && m.to === operatorId) ||
                          (m.from === operatorId && m.to === selectedUser.id)
                        )
                        .map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                              msg.isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            }`}>
                              <p className="text-sm">{msg.text}</p>
                              <p className="text-xs opacity-60 mt-1 text-right">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input value={messageInput} onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder="Type a secure message…" className="rounded-full px-4"
                      data-testid="input-message" />
                    <Button size="icon" onClick={sendMessage} disabled={!messageInput.trim()}
                      className="rounded-full" data-testid="button-send-message">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── History tab ──────────────────────────────────────────── */}
              {activeTab === "history" && (
                <div className="space-y-2">
                  {callHistory.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                        <History className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">No Call History</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          Completed calls will appear here
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                          onClick={() => { webRTCService.clearCallHistory(); setCallHistory([]); }}>
                          Clear history
                        </Button>
                      </div>
                      {callHistory.map(entry => (
                        <div key={entry.id}
                          className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                              entry.direction === "inbound" ? "bg-green-500/20" : "bg-blue-500/20"
                            }`}>
                              {entry.callType === "video"
                                ? <Video className="w-4 h-4 text-blue-400" />
                                : <Phone className={`w-4 h-4 ${entry.direction === "inbound" ? "text-green-400" : "text-blue-400"}`} />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{entry.remoteUserName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(entry.startTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  {" "}
                                  {new Date(entry.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{formatHistoryDuration(entry.duration)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs font-mono ${qualityColor(entry.quality)}`}>
                              {entry.quality.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        )}

      </div>
    </TooltipProvider>
  );
}
