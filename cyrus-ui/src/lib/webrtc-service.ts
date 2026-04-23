// WebRTC Service for Voice and Video Calls
// Premium Military-Grade Real-Time Communication System
// Enhanced with reconnection, heartbeat, and crystal-clear quality

export interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

export interface CallState {
  isInCall: boolean;
  callType: "voice" | "video" | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "connecting";
}

export interface OnlineUser {
  id: string;
  name: string;
  deviceId: string;
  status: "online" | "busy" | "in_call";
  lastSeen: number;
}

export interface ChatMessage {
  from: string;
  to: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

export interface ConnectionStats {
  bitrate: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  quality: "excellent" | "good" | "fair" | "poor";
}

type MessageHandler = (message: ChatMessage) => void;
type UserListHandler = (users: OnlineUser[]) => void;
type CallHandler = (data: { from: string; callerName: string; callType: "voice" | "video" }) => void;
type CallResponseHandler = (data: { accepted: boolean; reason?: string }) => void;
type CallEndHandler = () => void;
type RemoteStreamHandler = (stream: MediaStream) => void;
type ConnectionQualityHandler = (quality: "excellent" | "good" | "fair" | "poor" | "connecting") => void;
type LocalStreamHandler = (stream: MediaStream) => void;

// Premium ICE servers for maximum connectivity
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Additional STUN servers for redundancy
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.voip.blackberry.com:3478" },
    // TURN servers for NAT traversal (critical for reliability)
    { 
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    { 
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    { 
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turns:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};

// Adaptive media constraints with fallback
const getMediaConstraints = async (callType: "voice" | "video"): Promise<MediaStreamConstraints> => {
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  if (callType === "voice") {
    return { audio: audioConstraints, video: false };
  }

  // Try to get capabilities to determine best settings
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideoDevice = devices.some(d => d.kind === 'videoinput');
    
    if (!hasVideoDevice) {
      console.log("[WebRTC] No video device found, falling back to audio only");
      return { audio: audioConstraints, video: false };
    }
  } catch (e) {
    console.log("[WebRTC] Could not enumerate devices");
  }

  // Start with moderate quality settings (720p/30fps) for reliability
  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user"
  };

  return { audio: audioConstraints, video: videoConstraints };
};

// Helper to get media with automatic fallback
const getMediaWithFallback = async (callType: "voice" | "video"): Promise<MediaStream> => {
  const constraints = await getMediaConstraints(callType);
  
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.warn("[WebRTC] Failed with ideal constraints, trying fallback:", error);
    
    // Fallback to minimal constraints
    const fallbackConstraints: MediaStreamConstraints = {
      audio: true,
      video: callType === "video" ? { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      } : false
    };
    
    try {
      return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
    } catch (fallbackError) {
      console.error("[WebRTC] Fallback also failed:", fallbackError);
      
      // Last resort - audio only
      if (callType === "video") {
        console.warn("[WebRTC] Video failed, trying audio only");
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (audioError) {
          throw new Error("Could not access any media devices");
        }
      }
      
      throw fallbackError;
    }
  }
};

class WebRTCService {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private deviceId: string;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  // Reconnection state
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: number = 15000;
  private lastPong: number = Date.now();
  
  // Handlers
  private onMessage: MessageHandler | null = null;
  private onUserList: UserListHandler | null = null;
  private onIncomingCall: CallHandler | null = null;
  private onCallResponse: CallResponseHandler | null = null;
  private onCallEnd: CallEndHandler | null = null;
  private onRemoteStream: RemoteStreamHandler | null = null;
  private onConnectionQuality: ConnectionQualityHandler | null = null;
  private onLocalStream: LocalStreamHandler | null = null;
  private onReconnecting: ((attempt: number) => void) | null = null;
  private onReconnected: (() => void) | null = null;
  private onDisconnected: (() => void) | null = null;
  
  // Call state
  private currentCallUserId: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private pendingCallType: "voice" | "video" | null = null;
  private isInitiator: boolean = false;
  private statsTimer: NodeJS.Timeout | null = null;
  private iceGatheringComplete: boolean = false;
  private connectionEstablished: boolean = false;
  
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }
  
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem("cyrus_device_id");
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("cyrus_device_id", deviceId);
    }
    return deviceId;
  }
  
  connect(userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userId = userId;
      this.userName = userName;
      
      this.createWebSocket()
        .then(() => {
          this.startHeartbeat();
          resolve();
        })
        .catch(reject);
    });
  }
  
  private createWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log("[WebRTC] Connecting to signaling server:", wsUrl);
      
      try {
        this.socket = new WebSocket(wsUrl);
      } catch (error) {
        console.error("[WebRTC] Failed to create WebSocket:", error);
        reject(error);
        return;
      }
      
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          this.socket.close();
          reject(new Error("Connection timeout"));
        }
      }, 10000);
      
      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("[WebRTC] Connected to signaling server");
        
        // Check if this is a reconnection before resetting counter
        const wasReconnecting = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.lastPong = Date.now();
        this.register();
        
        if (wasReconnecting && this.onReconnected) {
          console.log("[WebRTC] Reconnection successful");
          this.onReconnected();
        }
        
        resolve();
      };
      
      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log("[WebRTC] Disconnected from signaling server", event.code, event.reason);
        this.stopHeartbeat();
        
        if (this.onDisconnected) {
          this.onDisconnected();
        }
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && this.userId) {
          this.attemptReconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error("[WebRTC] WebSocket error:", error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("[WebRTC] Failed to parse message:", error);
        }
      };
    });
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WebRTC] Max reconnection attempts reached");
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`[WebRTC] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    if (this.onReconnecting) {
      this.onReconnecting(this.reconnectAttempts);
    }
    
    this.reconnectTimer = setTimeout(() => {
      if (this.userId && this.userName) {
        this.createWebSocket()
          .then(() => {
            this.startHeartbeat();
            console.log("[WebRTC] Reconnected successfully");
          })
          .catch(() => {
            this.attemptReconnect();
          });
      }
    }, delay);
  }
  
  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send ping
        this.send({ type: "ping", data: { timestamp: Date.now() } });
        
        // Check for timeout
        if (Date.now() - this.lastPong > this.heartbeatInterval * 3) {
          console.log("[WebRTC] Heartbeat timeout, reconnecting...");
          this.socket.close();
        }
      }
    }, this.heartbeatInterval);
  }
  
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  private register() {
    this.send({
      type: "register",
      data: {
        userId: this.userId,
        userName: this.userName,
        deviceId: this.deviceId
      }
    });
  }
  
  private send(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error("[WebRTC] Failed to send message:", error);
      }
    } else {
      console.warn("[WebRTC] Cannot send - socket not open");
    }
  }
  
  private async handleMessage(message: any) {
    switch (message.type) {
      case "pong":
        this.lastPong = Date.now();
        break;
        
      case "user-list":
        if (this.onUserList) {
          this.onUserList(message.data);
        }
        break;
        
      case "text-message":
        if (this.onMessage) {
          this.onMessage({
            from: message.from,
            to: message.to,
            text: message.data.text,
            timestamp: message.data.timestamp,
            isOwn: false
          });
        }
        break;
        
      case "call-request":
        console.log("[WebRTC] Incoming call request from:", message.from);
        if (this.onIncomingCall) {
          this.onIncomingCall({
            from: message.from,
            callerName: message.data.callerName,
            callType: message.data.callType
          });
        }
        break;
        
      case "call-response":
        console.log("[WebRTC] Call response:", message.data);
        if (message.data.accepted) {
          this.currentCallUserId = message.from;
          if (this.isInitiator && this.pendingCallType) {
            await this.initiateWebRTC(message.from, this.pendingCallType);
          }
        }
        if (this.onCallResponse) {
          this.onCallResponse(message.data);
        }
        break;
        
      case "call-end":
        console.log("[WebRTC] Call ended by remote");
        this.cleanupCall(false);
        if (this.onCallEnd) {
          this.onCallEnd();
        }
        break;
        
      case "offer":
        console.log("[WebRTC] Received offer from:", message.from);
        await this.handleOffer(message);
        break;
        
      case "answer":
        console.log("[WebRTC] Received answer from:", message.from);
        await this.handleAnswer(message);
        break;
        
      case "ice-candidate":
        await this.handleIceCandidate(message);
        break;
        
      case "ice-restart":
        console.log("[WebRTC] ICE restart requested");
        await this.handleIceRestart(message);
        break;
    }
  }
  
  private async createPeerConnection(): Promise<RTCPeerConnection> {
    console.log("[WebRTC] Creating peer connection");
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.iceGatheringComplete = false;
    this.connectionEstablished = false;
    
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCallUserId) {
        console.log("[WebRTC] Sending ICE candidate");
        this.send({
          type: "ice-candidate",
          from: this.userId,
          to: this.currentCallUserId,
          data: event.candidate.toJSON()
        });
      }
    };
    
    pc.onicegatheringstatechange = () => {
      console.log("[WebRTC] ICE gathering state:", pc.iceGatheringState);
      if (pc.iceGatheringState === "complete") {
        this.iceGatheringComplete = true;
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
      
      switch (pc.iceConnectionState) {
        case "connected":
        case "completed":
          this.connectionEstablished = true;
          if (this.onConnectionQuality) {
            this.onConnectionQuality("excellent");
          }
          this.startStatsMonitoring();
          break;
        case "checking":
          if (this.onConnectionQuality) {
            this.onConnectionQuality("connecting");
          }
          break;
        case "disconnected":
          if (this.onConnectionQuality) {
            this.onConnectionQuality("poor");
          }
          // Try ICE restart
          this.attemptIceRestart();
          break;
        case "failed":
          console.log("[WebRTC] ICE connection failed, attempting restart");
          this.attemptIceRestart();
          break;
        case "closed":
          this.stopStatsMonitoring();
          break;
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        // Wait a moment before cleanup in case of temporary disconnection
        setTimeout(() => {
          if (this.peerConnection && 
              (this.peerConnection.connectionState === "disconnected" || 
               this.peerConnection.connectionState === "failed")) {
            console.log("[WebRTC] Connection lost permanently");
            this.cleanupCall(true);
            if (this.onCallEnd) {
              this.onCallEnd();
            }
          }
        }, 5000);
      }
    };
    
    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received:", event.track.kind);
      
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      
      this.remoteStream.addTrack(event.track);
      
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
      
      // Handle track ended
      event.track.onended = () => {
        console.log("[WebRTC] Remote track ended:", event.track.kind);
      };
      
      event.track.onmute = () => {
        console.log("[WebRTC] Remote track muted:", event.track.kind);
      };
      
      event.track.onunmute = () => {
        console.log("[WebRTC] Remote track unmuted:", event.track.kind);
      };
    };
    
    pc.onnegotiationneeded = async () => {
      console.log("[WebRTC] Negotiation needed");
    };
    
    return pc;
  }
  
  private async attemptIceRestart() {
    if (!this.peerConnection || !this.currentCallUserId || !this.isInitiator) return;
    
    console.log("[WebRTC] Attempting ICE restart");
    
    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      
      this.send({
        type: "offer",
        from: this.userId,
        to: this.currentCallUserId,
        data: offer
      });
    } catch (error) {
      console.error("[WebRTC] ICE restart failed:", error);
    }
  }
  
  private async handleIceRestart(message: any) {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.send({
        type: "answer",
        from: this.userId,
        to: message.from,
        data: answer
      });
    } catch (error) {
      console.error("[WebRTC] ICE restart handling failed:", error);
    }
  }
  
  private startStatsMonitoring() {
    this.stopStatsMonitoring();
    
    this.statsTimer = setInterval(async () => {
      if (!this.peerConnection) return;
      
      try {
        const stats = await this.peerConnection.getStats();
        let packetsLost = 0;
        let jitter = 0;
        let roundTripTime = 0;
        let bytesReceived = 0;
        
        stats.forEach((report) => {
          if (report.type === "inbound-rtp") {
            packetsLost = report.packetsLost || 0;
            jitter = report.jitter || 0;
            bytesReceived = report.bytesReceived || 0;
          }
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            roundTripTime = report.currentRoundTripTime || 0;
          }
        });
        
        // Calculate quality based on metrics
        let quality: "excellent" | "good" | "fair" | "poor" = "excellent";
        
        if (roundTripTime > 0.3 || packetsLost > 50 || jitter > 0.05) {
          quality = "poor";
        } else if (roundTripTime > 0.15 || packetsLost > 20 || jitter > 0.03) {
          quality = "fair";
        } else if (roundTripTime > 0.08 || packetsLost > 5 || jitter > 0.01) {
          quality = "good";
        }
        
        if (this.onConnectionQuality) {
          this.onConnectionQuality(quality);
        }
      } catch (error) {
        console.error("[WebRTC] Stats monitoring error:", error);
      }
    }, 2000);
  }
  
  private stopStatsMonitoring() {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }
  
  async startCall(targetUserId: string, targetUserName: string, callType: "voice" | "video"): Promise<void> {
    console.log(`[WebRTC] Starting ${callType} call to ${targetUserName}`);
    
    this.currentCallUserId = targetUserId;
    this.pendingCallType = callType;
    this.isInitiator = true;
    this.pendingCandidates = [];
    
    this.send({
      type: "call-request",
      from: this.userId,
      to: targetUserId,
      data: {
        callType,
        callerName: this.userName
      }
    });
  }
  
  async acceptCall(callerId: string, callType: "voice" | "video"): Promise<void> {
    console.log(`[WebRTC] Accepting ${callType} call from ${callerId}`);
    
    this.currentCallUserId = callerId;
    this.pendingCallType = callType;
    this.isInitiator = false;
    this.pendingCandidates = [];
    
    try {
      // Get local media first with adaptive fallback
      this.localStream = await getMediaWithFallback(callType);
      
      console.log("[WebRTC] Local media acquired");
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }
      
      // Create peer connection
      this.peerConnection = await this.createPeerConnection();
      
      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        console.log("[WebRTC] Adding local track:", track.kind);
        this.peerConnection!.addTrack(track, this.localStream!);
      });
      
      // Send acceptance
      this.send({
        type: "call-response",
        from: this.userId,
        to: callerId,
        data: { accepted: true }
      });
      
    } catch (error) {
      console.error("[WebRTC] Failed to accept call:", error);
      this.rejectCall(callerId, "Failed to access camera/microphone");
      throw error;
    }
  }
  
  rejectCall(callerId: string, reason: string = "Call declined") {
    console.log("[WebRTC] Rejecting call:", reason);
    
    this.send({
      type: "call-response",
      from: this.userId,
      to: callerId,
      data: { accepted: false, reason }
    });
    
    this.currentCallUserId = null;
    this.pendingCallType = null;
  }
  
  async initiateWebRTC(targetUserId: string, callType: "voice" | "video"): Promise<MediaStream | null> {
    console.log(`[WebRTC] Initiating WebRTC connection for ${callType}`);
    
    try {
      // Get local media with adaptive fallback
      this.localStream = await getMediaWithFallback(callType);
      
      console.log("[WebRTC] Local media acquired for initiator");
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }
      
      // Create peer connection
      this.peerConnection = await this.createPeerConnection();
      
      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        console.log("[WebRTC] Adding local track:", track.kind);
        this.peerConnection!.addTrack(track, this.localStream!);
      });
      
      // Create and send offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video"
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      console.log("[WebRTC] Sending offer");
      this.send({
        type: "offer",
        from: this.userId,
        to: targetUserId,
        data: offer
      });
      
      return this.localStream;
    } catch (error) {
      console.error("[WebRTC] Failed to initiate WebRTC:", error);
      this.cleanupCall(true);
      return null;
    }
  }
  
  private async handleOffer(message: any) {
    console.log("[WebRTC] Handling offer");
    
    if (!this.peerConnection) {
      console.log("[WebRTC] Creating peer connection for offer");
      this.peerConnection = await this.createPeerConnection();
      
      // If we don't have local stream yet, get it now with adaptive fallback
      if (!this.localStream && this.pendingCallType) {
        try {
          this.localStream = await getMediaWithFallback(this.pendingCallType);
          
          if (this.onLocalStream) {
            this.onLocalStream(this.localStream);
          }
          
          this.localStream.getTracks().forEach(track => {
            this.peerConnection!.addTrack(track, this.localStream!);
          });
        } catch (error) {
          console.error("[WebRTC] Failed to get media for offer:", error);
        }
      }
    }
    
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
      console.log("[WebRTC] Remote description set");
      
      // Add pending candidates
      for (const candidate of this.pendingCandidates) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("[WebRTC] Added pending ICE candidate");
        } catch (error) {
          console.error("[WebRTC] Failed to add pending ICE candidate:", error);
        }
      }
      this.pendingCandidates = [];
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log("[WebRTC] Sending answer");
      this.send({
        type: "answer",
        from: this.userId,
        to: message.from,
        data: answer
      });
      
    } catch (error) {
      console.error("[WebRTC] Failed to handle offer:", error);
    }
  }
  
  private async handleAnswer(message: any) {
    console.log("[WebRTC] Handling answer");
    
    if (!this.peerConnection) {
      console.error("[WebRTC] No peer connection for answer");
      return;
    }
    
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
      console.log("[WebRTC] Remote description set from answer");
      
      // Add pending candidates
      for (const candidate of this.pendingCandidates) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("[WebRTC] Added pending ICE candidate");
        } catch (error) {
          console.error("[WebRTC] Failed to add pending ICE candidate:", error);
        }
      }
      this.pendingCandidates = [];
      
    } catch (error) {
      console.error("[WebRTC] Failed to handle answer:", error);
    }
  }
  
  private async handleIceCandidate(message: any) {
    const candidate = message.data;
    
    if (!this.peerConnection) {
      console.log("[WebRTC] Queuing ICE candidate - no peer connection");
      this.pendingCandidates.push(candidate);
      return;
    }
    
    if (!this.peerConnection.remoteDescription) {
      console.log("[WebRTC] Queuing ICE candidate - no remote description");
      this.pendingCandidates.push(candidate);
      return;
    }
    
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[WebRTC] Added ICE candidate");
    } catch (error) {
      console.error("[WebRTC] Failed to add ICE candidate:", error);
    }
  }
  
  endCall(sendSignal: boolean = true) {
    console.log("[WebRTC] Ending call, sendSignal:", sendSignal);
    this.cleanupCall(sendSignal);
  }
  
  private cleanupCall(sendSignal: boolean) {
    if (sendSignal && this.currentCallUserId) {
      this.send({
        type: "call-end",
        from: this.userId,
        to: this.currentCallUserId,
        data: {}
      });
    }
    
    this.stopStatsMonitoring();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log("[WebRTC] Stopped local track:", track.kind);
      });
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    this.currentCallUserId = null;
    this.pendingCallType = null;
    this.isInitiator = false;
    this.pendingCandidates = [];
    this.iceGatheringComplete = false;
    this.connectionEstablished = false;
  }
  
  sendTextMessage(to: string, text: string) {
    this.send({
      type: "text-message",
      from: this.userId,
      to: to,
      data: { text, timestamp: Date.now() }
    });
  }
  
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const isMuted = audioTracks[0].enabled;
        audioTracks.forEach(track => {
          track.enabled = !isMuted;
        });
        return isMuted; // Return new muted state
      }
    }
    return false;
  }
  
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const isOff = videoTracks[0].enabled;
        videoTracks.forEach(track => {
          track.enabled = !isOff;
        });
        return isOff; // Return new off state
      }
    }
    return false;
  }
  
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
  
  // Event handlers
  setOnMessage(handler: MessageHandler) {
    this.onMessage = handler;
  }
  
  setOnUserList(handler: UserListHandler) {
    this.onUserList = handler;
  }
  
  setOnIncomingCall(handler: CallHandler) {
    this.onIncomingCall = handler;
  }
  
  setOnCallResponse(handler: CallResponseHandler) {
    this.onCallResponse = handler;
  }
  
  setOnCallEnd(handler: CallEndHandler) {
    this.onCallEnd = handler;
  }
  
  setOnRemoteStream(handler: RemoteStreamHandler) {
    this.onRemoteStream = handler;
  }
  
  setOnConnectionQuality(handler: ConnectionQualityHandler) {
    this.onConnectionQuality = handler;
  }
  
  setOnLocalStream(handler: LocalStreamHandler) {
    this.onLocalStream = handler;
  }
  
  setOnReconnecting(handler: (attempt: number) => void) {
    this.onReconnecting = handler;
  }
  
  setOnReconnected(handler: () => void) {
    this.onReconnected = handler;
  }
  
  setOnDisconnected(handler: () => void) {
    this.onDisconnected = handler;
  }
  
  disconnect() {
    console.log("[WebRTC] Disconnecting");
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.cleanupCall(true);
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close(1000, "User disconnect");
      this.socket = null;
    }
    
    this.userId = null;
    this.userName = null;
  }
  
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
  
  getCurrentUserId(): string | null {
    return this.userId;
  }
  
  getConnectionState(): string {
    if (!this.peerConnection) return "none";
    return this.peerConnection.connectionState;
  }
  
  getIceConnectionState(): string {
    if (!this.peerConnection) return "none";
    return this.peerConnection.iceConnectionState;
  }
}

export const webRTCService = new WebRTCService();
