import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  Wifi,
  WifiOff,
  User,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  PhoneIncoming,
  PhoneOutgoing,
  Radio,
  Zap,
  Shield,
  Activity
} from "lucide-react";
import { webRTCService, OnlineUser, ChatMessage } from "@/lib/webrtc-service";
import { useToast } from "@/hooks/use-toast";

interface CommunicationPanelProps {
  operatorName?: string;
  operatorId?: string;
  isAuthenticated: boolean;
}

export function CommunicationPanel({ 
  operatorName = "Operator", 
  operatorId,
  isAuthenticated 
}: CommunicationPanelProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{from: string; callerName: string; callType: "voice" | "video"} | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<"users" | "chat">("users");
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "fair" | "poor" | "connecting">("connecting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCallConnecting, setIsCallConnecting] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Generate stable device-based user ID
  const getStableUserId = useCallback(() => {
    if (operatorId && operatorId !== "null") return operatorId;
    let stableId = localStorage.getItem("cyrus_comm_user_id");
    if (!stableId) {
      stableId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("cyrus_comm_user_id", stableId);
    }
    return stableId;
  }, [operatorId]);

  // Connect to signaling server
  useEffect(() => {
    if (isAuthenticated) {
      const userId = getStableUserId();
      const userName = operatorName || "Operator";
      
      webRTCService.connect(userId, userName)
        .then(() => {
          setIsConnected(true);
          setIsReconnecting(false);
          toast({
            title: "CYRUS COMMS Online",
            description: "Secure channel established - Ready for communication",
          });
        })
        .catch((error) => {
          console.error("Failed to connect:", error);
          toast({
            title: "Connection Failed",
            description: "Could not establish secure channel",
            variant: "destructive"
          });
        });
      
      // Set up handlers
      webRTCService.setOnUserList((users) => {
        setOnlineUsers(users.filter(u => u.id !== userId));
      });
      
      webRTCService.setOnMessage((message) => {
        setMessages(prev => [...prev, message]);
      });
      
      webRTCService.setOnIncomingCall((data) => {
        setIncomingCall(data);
        toast({
          title: "Incoming Transmission",
          description: `${data.callerName} requesting ${data.callType} link`,
        });
      });
      
      webRTCService.setOnCallResponse((data) => {
        if (data.accepted) {
          setIsCallConnecting(true);
          toast({
            title: "Link Accepted",
            description: "Establishing secure connection...",
          });
        } else {
          toast({
            title: "Link Declined",
            description: data.reason || "Connection request denied",
            variant: "destructive"
          });
          setIsInCall(false);
          setCallType(null);
          setIsCallConnecting(false);
        }
      });
      
      webRTCService.setOnCallEnd(() => {
        endCall(false);
        toast({
          title: "Transmission Ended",
          description: "Secure channel closed",
        });
      });
      
      webRTCService.setOnRemoteStream((stream) => {
        console.log("[CommPanel] Remote stream received");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(e => console.log("Remote play error:", e));
        }
        setIsCallConnecting(false);
      });
      
      webRTCService.setOnLocalStream((stream) => {
        console.log("[CommPanel] Local stream received");
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => console.log("Local play error:", e));
        }
      });
      
      webRTCService.setOnConnectionQuality((quality) => {
        setConnectionQuality(quality);
      });
      
      webRTCService.setOnReconnecting((attempt) => {
        setIsReconnecting(true);
        setReconnectAttempt(attempt);
        toast({
          title: "Reconnecting",
          description: `Attempt ${attempt}/10...`,
        });
      });
      
      webRTCService.setOnReconnected(() => {
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setIsConnected(true);
        toast({
          title: "Reconnected",
          description: "Secure channel restored",
        });
      });
      
      webRTCService.setOnDisconnected(() => {
        setIsConnected(false);
      });
      
      return () => {
        webRTCService.disconnect();
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, operatorName, getStableUserId, toast]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Call timer
  useEffect(() => {
    if (isInCall && !isCallConnecting) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isInCall, isCallConnecting]);
  
  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  
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
  };
  
  const startCall = async (user: OnlineUser, type: "voice" | "video") => {
    setSelectedUser(user);
    setCallType(type);
    setIsInCall(true);
    setIsCallConnecting(true);
    setConnectionQuality("connecting");
    
    await webRTCService.startCall(user.id, user.name, type);
  };
  
  const acceptCall = async () => {
    if (incomingCall) {
      setCallType(incomingCall.callType);
      setIsInCall(true);
      setIsCallConnecting(true);
      setConnectionQuality("connecting");
      
      const callerUser = onlineUsers.find(u => u.id === incomingCall.from);
      if (callerUser) {
        setSelectedUser(callerUser);
      } else {
        setSelectedUser({
          id: incomingCall.from,
          name: incomingCall.callerName,
          deviceId: "unknown",
          status: "in_call",
          lastSeen: Date.now()
        });
      }
      
      try {
        await webRTCService.acceptCall(incomingCall.from, incomingCall.callType);
      } catch (error) {
        console.error("Failed to accept call:", error);
        toast({
          title: "Connection Failed",
          description: "Could not access camera/microphone",
          variant: "destructive"
        });
        setIsInCall(false);
        setCallType(null);
        setIsCallConnecting(false);
      }
      
      setIncomingCall(null);
    }
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
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (isFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [isFullscreen]);
  
  const toggleMute = () => {
    const muted = webRTCService.toggleMute();
    setIsMuted(muted);
  };
  
  const toggleVideo = () => {
    const off = webRTCService.toggleVideo();
    setIsVideoOff(off);
  };
  
  const toggleFullscreen = async () => {
    if (!callContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      await callContainerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };
  
  const sendMessage = () => {
    if (messageInput.trim() && selectedUser) {
      webRTCService.sendTextMessage(selectedUser.id, messageInput.trim());
      setMessages(prev => [...prev, {
        from: operatorId || "",
        to: selectedUser.id,
        text: messageInput.trim(),
        timestamp: Date.now(),
        isOwn: true
      }]);
      setMessageInput("");
    }
  };
  
  const selectUserForChat = (user: OnlineUser) => {
    setSelectedUser(user);
    setActiveTab("chat");
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "in_call": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case "online": return "ONLINE";
      case "busy": return "BUSY";
      case "in_call": return "IN CALL";
      default: return "OFFLINE";
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Premium Status Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-background via-muted/30 to-background p-3 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isReconnecting ? 'animate-pulse' : ''}`} />
            {isConnected && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-50" />
            )}
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
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1 font-mono text-xs">
            <Users className="w-3 h-3" />
            {onlineUsers.length} DEVICE{onlineUsers.length !== 1 ? "S" : ""}
          </Badge>
          
          <Badge variant="outline" className="gap-1 font-mono text-xs">
            <Activity className="w-3 h-3 text-green-400" />
            ENCRYPTED
          </Badge>
        </div>
      </div>
      
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
                </div>
                <div>
                  <p className="font-bold text-xl">{incomingCall.callerName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {incomingCall.callType === "video" ? (
                        <><Video className="w-3 h-3 mr-1" /> VIDEO LINK</>
                      ) : (
                        <><Phone className="w-3 h-3 mr-1" /> VOICE LINK</>
                      )}
                    </Badge>
                    <span className="text-sm text-muted-foreground animate-pulse">Incoming...</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  variant="destructive"
                  onClick={rejectCall}
                  className="rounded-full w-14 h-14"
                  data-testid="button-reject-call"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
                <Button 
                  size="lg" 
                  className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700"
                  onClick={acceptCall}
                  data-testid="button-accept-call"
                >
                  <Phone className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Active Call UI - Premium 8K Quality Interface */}
      {isInCall && (
        <Card 
          ref={callContainerRef}
          className={`overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
        >
          <CardContent className={`p-0 ${isFullscreen ? 'h-screen' : ''}`}>
            <div className={`relative ${callType === "video" ? (isFullscreen ? 'h-full' : 'aspect-video') : 'py-12'} bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`}>
              
              {/* Video Feeds */}
              {callType === "video" && (
                <>
                  {/* Remote Video - Full 8K Quality */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    data-testid="video-remote"
                  />
                  
                  {/* Connecting Overlay */}
                  {isCallConnecting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                      <div className="text-center">
                        <div className="relative w-24 h-24 mx-auto mb-4">
                          <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
                          <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                          <Radio className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <p className="text-lg font-mono text-primary">ESTABLISHING SECURE LINK</p>
                        <p className="text-sm text-muted-foreground mt-2">Encrypting connection...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Local Video PIP */}
                  <div className="absolute bottom-20 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                      data-testid="video-local"
                    />
                    {isVideoOff && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <VideoOff className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* Voice Call UI */}
              {callType === "voice" && (
                <div className="flex flex-col items-center justify-center py-8 relative z-10">
                  {/* Audio Visualization Background */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="flex gap-1">
                      {[...Array(20)].map((_, i) => (
                        <div 
                          key={i}
                          className="w-1 bg-primary rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 60 + 20}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: `${0.5 + Math.random() * 0.5}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-primary/50">
                      <AvatarFallback className="text-5xl font-bold bg-gradient-to-br from-primary/30 to-primary/10">
                        {selectedUser?.name[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  <p className="mt-6 font-bold text-2xl text-white">{selectedUser?.name}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {getQualityIcon()}
                    <span className="text-sm font-mono text-muted-foreground">{getQualityLabel()}</span>
                  </div>
                  
                  {isCallConnecting && (
                    <div className="mt-4 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-primary animate-pulse" />
                      <span className="text-sm text-primary animate-pulse">Connecting...</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Top Status Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm font-mono">
                    <Shield className="w-3 h-3 mr-1 text-green-400" />
                    ENCRYPTED
                  </Badge>
                  
                  <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm font-mono gap-1">
                    {getQualityIcon()}
                    {getQualityLabel()}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white text-lg tabular-nums bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
                    {formatDuration(callDuration)}
                  </span>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                    data-testid="button-fullscreen"
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
              
              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="flex items-center justify-center gap-4">
                  {/* Mute Button */}
                  <Button
                    size="lg"
                    variant={isMuted ? "destructive" : "secondary"}
                    onClick={toggleMute}
                    className="rounded-full w-14 h-14 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-0"
                    data-testid="button-toggle-mute"
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                  
                  {/* Video Toggle */}
                  {callType === "video" && (
                    <Button
                      size="lg"
                      variant={isVideoOff ? "destructive" : "secondary"}
                      onClick={toggleVideo}
                      className="rounded-full w-14 h-14 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-0"
                      data-testid="button-toggle-video"
                    >
                      {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </Button>
                  )}
                  
                  {/* End Call */}
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() => endCall(true)}
                    className="rounded-full w-16 h-16 shadow-lg shadow-red-500/30"
                    data-testid="button-end-call"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                </div>
                
                {/* User Info */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">{selectedUser?.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-white/80 text-sm">{selectedUser?.name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Communication Interface */}
      {!isInCall && (
        <Card className="border-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "users" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("users")}
                className="gap-1"
                data-testid="button-tab-users"
              >
                <Users className="w-4 h-4" />
                Devices
              </Button>
              <Button
                variant={activeTab === "chat" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("chat")}
                disabled={!selectedUser}
                className="gap-1"
                data-testid="button-tab-chat"
              >
                <MessageSquare className="w-4 h-4" />
                Messages
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4">
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
                  onlineUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-muted/30 to-transparent hover-elevate transition-all"
                    >
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
                              {user.deviceId}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => selectUserForChat(user)}
                          disabled={user.status === "in_call"}
                          className="rounded-full"
                          data-testid={`button-chat-${user.id}`}
                        >
                          <MessageSquare className="w-5 h-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startCall(user, "voice")}
                          disabled={user.status === "in_call"}
                          className="rounded-full text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                          data-testid={`button-voice-call-${user.id}`}
                        >
                          <Phone className="w-5 h-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startCall(user, "video")}
                          disabled={user.status === "in_call"}
                          className="rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          data-testid={`button-video-call-${user.id}`}
                        >
                          <Video className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedUser(null);
                      setActiveTab("users");
                    }}
                    data-testid="button-close-chat"
                  >
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
                            <p className="text-xs opacity-60 mt-1 text-right">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a secure message..."
                    className="rounded-full px-4"
                    data-testid="input-message"
                  />
                  <Button 
                    size="icon"
                    onClick={sendMessage}
                    disabled={!messageInput.trim()}
                    className="rounded-full"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
