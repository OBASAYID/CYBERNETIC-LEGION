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
  Info,
  Database,
  DatabaseZap,
  CloudOff,
  CloudUpload,
} from "lucide-react";
import { webRTCService, OnlineUser, ChatMessage, ConnectionStats, CallHistoryEntry } from "@/lib/webrtc-service";
import { useToast } from "@/hooks/use-toast";

interface DbHealthStatus {
  ok: boolean;
  dbConnected: boolean;
  fallbackMode: boolean;
  circuitOpen: boolean;
  consecutiveFailures: number;
  lastError: string | null;
  lastCheckedAt: string | null;
  queue: {
    size: number;
    oldestAgeMs: number;
    totalEnqueued: number;
    totalFlushed: number;
    totalDropped: number;
    successRate: number;
  };
  fallbackStoreSizes: {
    messages: number;
    calls: number;
    rooms: number;
    users: number;
    groups: number;
  };
  checkedAt: string;
}

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
  const [dbHealth, setDbHealth] = useState<DbHealthStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
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
  // DB health polling — every 30 s when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchDbHealth = async () => {
      try {
        const res = await fetch("/api/health/db");
        if (res.ok) {
          const data: DbHealthStatus = await res.json();
          const prev = dbHealth;
          setDbHealth(data);

          // Detect transition into / out of fallback mode
          if (prev && !prev.fallbackMode && data.fallbackMode) {
            toast({
              title: "Offline Mode Activated",
              description: "Database unavailable — messages will sync when connection is restored.",
              variant: "destructive",
            });
          } else if (prev && prev.fallbackMode && !data.fallbackMode) {
            setIsSyncing(true);
            toast({
              title: "Database Reconnected",
              description: "Syncing pending messages…",
            });
            // Give the server a moment to flush, then clear syncing indicator
            setTimeout(() => setIsSyncing(false), 4_000);
          }
        }
      } catch {
        // Network error — don't crash the panel
      }
    };

    fetchDbHealth();
    const interval = setInterval(fetchDbHealth, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  const getQualityIcon = () => {
    switch (connectionQuality) {
      case "excellent": return <SignalHigh className="w-4 h-4 text-green-400" />;
      case "good": return <SignalMedium className="w-4 h-4 text-green-400" />;
      case "fair": return <SignalMedium className="w-4 h-4 text-yellow-400" />;
      case "poor": return <SignalLow className="w-4 h-4 text-red-400" />;
      case "connecting": return <Radio className="w-4 h-4 text-blue-400 animate-pulse" />;
    }
  };
  
  const getQualityLabel = () => {
    switch (connectionQuality) {
      case "excellent": return "EXCELLENT";
      case "good": return "GOOD";
      case "fair": return "FAIR";
      case "poor": return "POOR";
      case "connecting": return "CONNECTING";
    }
  }, [isFullscreen]);

  // ── Call actions ───────────────────────────────────────────────────────────
  const startCall = async (user: OnlineUser, type: "voice" | "video") => {
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

      {/* DB / Offline Mode Status Bar */}
      {dbHealth && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
          dbHealth.fallbackMode
            ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
            : isSyncing
            ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
            : "bg-muted/20 border-muted/30 text-muted-foreground"
        }`}>
          <div className="flex items-center gap-2">
            {dbHealth.fallbackMode ? (
              <>
                <CloudOff className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-semibold">OFFLINE MODE</span>
                <span className="opacity-70">— DB unavailable, operating from memory</span>
              </>
            ) : isSyncing ? (
              <>
                <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
                <span className="font-semibold">SYNCING</span>
                <span className="opacity-70">— Flushing queued data to database…</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">DB CONNECTED</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {dbHealth.fallbackMode && dbHealth.queue.size > 0 && (
              <Badge variant="outline" className="gap-1 text-xs border-amber-500/40 text-amber-400">
                <Clock className="w-3 h-3" />
                {dbHealth.queue.size} PENDING
              </Badge>
            )}
            {dbHealth.lastError && dbHealth.fallbackMode && (
              <span className="opacity-60 truncate max-w-[180px]" title={dbHealth.lastError}>
                {dbHealth.lastError.slice(0, 40)}{dbHealth.lastError.length > 40 ? "…" : ""}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Incoming Call Modal */}
      {incomingCall && (
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
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
                {callType === "video" && (
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

                {/* ── Voice call UI ────────────────────────────────────────── */}
                {callType === "voice" && (
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

                {/* ── Top HUD ──────────────────────────────────────────────── */}
                <div className={`absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm font-mono text-xs">
                      <Shield className="w-3 h-3 mr-1 text-green-400" />
                      E2E ENCRYPTED
                    </Badge>

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

                    {/* Screen share */}
                    {callType === "video" && (
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

                    {/* Record */}
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

                    {/* End call */}
                    <Button size="lg" variant="destructive" onClick={() => endCall(true)}
                      className="rounded-full w-16 h-16 shadow-lg shadow-red-500/30"
                      data-testid="button-end-call">
                      <PhoneOff className="w-7 h-7" />
                    </Button>
                  </div>

                  {/* Participant info */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-xs">{selectedUser?.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-white/70 text-xs font-mono">{selectedUser?.name}</span>
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
                                disabled={user.status === "in_call"}
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
                                disabled={user.status === "in_call"}
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
                
                <ScrollArea className="h-72 border rounded-xl p-4 bg-muted/10">
                  <div className="space-y-3">
                    {messages
                      .filter(m => 
                        (m.from === selectedUser.id && m.to === operatorId) ||
                        (m.from === operatorId && m.to === selectedUser.id)
                      )
                      .map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                              msg.isOwn 
                                ? "bg-primary text-primary-foreground rounded-br-md" 
                                : "bg-muted rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm">{msg.text}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <p className="text-xs opacity-60">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {msg.isOwn && dbHealth?.fallbackMode && (
                                <Clock className="w-3 h-3 opacity-60 text-amber-300" title="Pending sync" />
                              )}
                              {msg.isOwn && !dbHealth?.fallbackMode && !isSyncing && (
                                <Activity className="w-3 h-3 opacity-40 text-green-300" title="Synced" />
                              )}
                              {msg.isOwn && isSyncing && (
                                <RefreshCw className="w-3 h-3 opacity-60 animate-spin text-blue-300" title="Syncing…" />
                              )}
                            </div>
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
