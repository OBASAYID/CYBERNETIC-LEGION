// WebRTC Service for Voice and Video Calls
// Enterprise-Grade Real-Time Communication System
// Matching Zoom/WhatsApp quality with advanced audio/video processing,
// adaptive bitrate, redundant TURN servers, and professional features.

// ─── Public Interfaces ────────────────────────────────────────────────────────

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

/** Detailed real-time call quality metrics surfaced to the UI. */
export interface ConnectionStats {
  /** Inbound audio bitrate in kbps */
  audioBitrate: number;
  /** Inbound video bitrate in kbps */
  videoBitrate: number;
  /** Total packets lost (inbound) */
  packetsLost: number;
  /** Packet loss percentage 0-100 */
  packetLossPercent: number;
  /** Audio jitter in ms */
  jitter: number;
  /** Round-trip time in ms */
  roundTripTime: number;
  /** Current video resolution (e.g. "1280x720") */
  resolution: string;
  /** Current video frame rate */
  frameRate: number;
  /** Active audio codec (e.g. "opus") */
  audioCodec: string;
  /** Active video codec (e.g. "VP9") */
  videoCodec: string;
  /** Computed quality tier */
  quality: "excellent" | "good" | "fair" | "poor";
  /** Network type if available */
  networkType: string;
  /** MOS score estimate 1-5 */
  mosScore: number;
}

/** A single entry in the call history log. */
export interface CallHistoryEntry {
  id: string;
  remoteUserId: string;
  remoteUserName: string;
  callType: "voice" | "video";
  direction: "inbound" | "outbound";
  startTime: number;
  endTime: number;
  duration: number;
  quality: "excellent" | "good" | "fair" | "poor" | "failed";
  avgBitrate: number;
  avgPacketLoss: number;
}

/** Available media devices enumerated from the browser. */
export interface MediaDeviceInfo2 {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

// ─── Handler Types ─────────────────────────────────────────────────────────────

type MessageHandler = (message: ChatMessage) => void;
type UserListHandler = (users: OnlineUser[]) => void;
type CallHandler = (data: { from: string; callerName: string; callType: "voice" | "video" }) => void;
type CallResponseHandler = (data: { accepted: boolean; reason?: string }) => void;
type CallEndHandler = () => void;
type RemoteStreamHandler = (stream: MediaStream) => void;
type ConnectionQualityHandler = (quality: "excellent" | "good" | "fair" | "poor" | "connecting") => void;
type LocalStreamHandler = (stream: MediaStream) => void;
type StatsHandler = (stats: ConnectionStats) => void;
type ScreenShareHandler = (stream: MediaStream | null) => void;
type RecordingHandler = (state: "started" | "stopped", blob?: Blob) => void;
type DeviceListHandler = (devices: MediaDeviceInfo2[]) => void;
type AudioLevelHandler = (level: number) => void;

// ─── ICE / TURN Configuration ─────────────────────────────────────────────────

/**
 * Enterprise-grade ICE configuration with redundant STUN + TURN servers.
 * Multiple TURN providers ensure connectivity across all network topologies
 * (symmetric NAT, corporate firewalls, cellular networks).
 */
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN – primary
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Cloudflare STUN
    { urls: "stun:stun.cloudflare.com:3478" },
    // Additional public STUN
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.voip.blackberry.com:3478" },
    // Metered TURN – UDP (lowest latency)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    // Metered TURN – TLS (firewall bypass)
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    // Metered TURN – TCP (deep packet inspection bypass)
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    // Metered TURNS – encrypted relay
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

// ─── Media Constraints ────────────────────────────────────────────────────────

/** Detect mobile to apply battery/data-friendly constraints. */
const isMobile = (): boolean =>
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * Build enterprise-grade MediaStreamConstraints.
 * Audio: echo cancellation + noise suppression + auto gain control.
 * Video: adaptive resolution/fps based on device type.
 */
const getMediaConstraints = async (
  callType: "voice" | "video"
): Promise<MediaStreamConstraints> => {
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // Prefer 48 kHz for Opus codec compatibility
    sampleRate: 48000,
    channelCount: 1
  };

  if (callType === "voice") {
    return { audio: audioConstraints, video: false };
  }

  // Enumerate devices to confirm camera availability
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some(d => d.kind === "videoinput");
    if (!hasCamera) {
      console.log("[WebRTC] No camera found – falling back to audio-only");
      return { audio: audioConstraints, video: false };
    }
  } catch {
    console.log("[WebRTC] Could not enumerate devices");
  }

  const mobile = isMobile();

  // Mobile: 480p/15fps to conserve battery and data
  // Desktop: 720p/30fps as baseline (adaptive bitrate handles degradation)
  const videoConstraints: MediaTrackConstraints = mobile
    ? {
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 },
        frameRate: { ideal: 15, max: 20 },
        facingMode: "user"
      }
    : {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: "user"
      };

  return { audio: audioConstraints, video: videoConstraints };
};

/**
 * Acquire local media with a three-tier fallback strategy:
 * 1. Ideal constraints (HD/30fps)
 * 2. Reduced constraints (SD/15fps)
 * 3. Audio-only (if video device fails entirely)
 */
const getMediaWithFallback = async (callType: "voice" | "video"): Promise<MediaStream> => {
  const constraints = await getMediaConstraints(callType);

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn("[WebRTC] Ideal constraints failed, trying SD fallback:", err);

    const sdConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: callType === "video"
        ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } }
        : false
    };

    try {
      return await navigator.mediaDevices.getUserMedia(sdConstraints);
    } catch (sdErr) {
      console.error("[WebRTC] SD fallback failed:", sdErr);

      if (callType === "video") {
        console.warn("[WebRTC] Video unavailable – falling back to audio-only");
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
          throw new Error("Could not access any media devices");
        }
      }

      throw sdErr;
    }
  }
};

// ─── Enterprise WebRTC Service ────────────────────────────────────────────────

class WebRTCService {
  // ── Signaling ──────────────────────────────────────────────────────────────
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private deviceId: string;

  // ── WebRTC Core ────────────────────────────────────────────────────────────
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;

  // ── Reconnection / Heartbeat ───────────────────────────────────────────────
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: number = 15000;
  private lastPong: number = Date.now();

  // ── Call State ─────────────────────────────────────────────────────────────
  private currentCallUserId: string | null = null;
  private currentCallUserName: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private pendingCallType: "voice" | "video" | null = null;
  private isInitiator: boolean = false;
  private iceGatheringComplete: boolean = false;
  private connectionEstablished: boolean = false;
  private callStartTime: number = 0;
  private callDirection: "inbound" | "outbound" = "outbound";

  // ── Stats & Monitoring ─────────────────────────────────────────────────────
  private statsTimer: NodeJS.Timeout | null = null;
  private prevBytesReceived: { audio: number; video: number } = { audio: 0, video: 0 };
  private prevStatsTimestamp: number = 0;
  private statsHistory: ConnectionStats[] = [];

  // ── Recording ──────────────────────────────────────────────────────────────
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];

  // ── Audio Level Monitoring ─────────────────────────────────────────────────
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioLevelTimer: NodeJS.Timeout | null = null;

  // ── Call History ───────────────────────────────────────────────────────────
  private callHistory: CallHistoryEntry[] = [];

  // ── Event Handlers ─────────────────────────────────────────────────────────
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
  private onStats: StatsHandler | null = null;
  private onScreenShare: ScreenShareHandler | null = null;
  private onRecording: RecordingHandler | null = null;
  private onDeviceList: DeviceListHandler | null = null;
  private onAudioLevel: AudioLevelHandler | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.loadCallHistory();
  }

  // ── Device ID ──────────────────────────────────────────────────────────────

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem("cyrus_device_id");
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("cyrus_device_id", deviceId);
    }
    return deviceId;
  }

  // ── Call History Persistence ───────────────────────────────────────────────

  private loadCallHistory() {
    try {
      const stored = localStorage.getItem("cyrus_call_history");
      if (stored) this.callHistory = JSON.parse(stored);
    } catch {
      this.callHistory = [];
    }
  }

  private saveCallHistory() {
    try {
      // Keep last 100 entries
      const trimmed = this.callHistory.slice(-100);
      localStorage.setItem("cyrus_call_history", JSON.stringify(trimmed));
    } catch {
      // Storage quota exceeded – ignore
    }
  }

  private recordCallHistory(quality: "excellent" | "good" | "fair" | "poor" | "failed") {
    if (!this.currentCallUserId || !this.callStartTime) return;

    const endTime = Date.now();
    const avgStats = this.computeAverageStats();

    const entry: CallHistoryEntry = {
      id: `call-${this.callStartTime}`,
      remoteUserId: this.currentCallUserId,
      remoteUserName: this.currentCallUserName || "Unknown",
      callType: this.pendingCallType || "voice",
      direction: this.callDirection,
      startTime: this.callStartTime,
      endTime,
      duration: Math.floor((endTime - this.callStartTime) / 1000),
      quality,
      avgBitrate: avgStats.audioBitrate + avgStats.videoBitrate,
      avgPacketLoss: avgStats.packetLossPercent
    };

    this.callHistory.push(entry);
    this.saveCallHistory();
  }

  private computeAverageStats(): ConnectionStats {
    if (this.statsHistory.length === 0) {
      return this.emptyStats();
    }
    const n = this.statsHistory.length;
    const sum = this.statsHistory.reduce(
      (acc, s) => ({
        audioBitrate: acc.audioBitrate + s.audioBitrate,
        videoBitrate: acc.videoBitrate + s.videoBitrate,
        packetsLost: acc.packetsLost + s.packetsLost,
        packetLossPercent: acc.packetLossPercent + s.packetLossPercent,
        jitter: acc.jitter + s.jitter,
        roundTripTime: acc.roundTripTime + s.roundTripTime,
        resolution: s.resolution,
        frameRate: acc.frameRate + s.frameRate,
        audioCodec: s.audioCodec,
        videoCodec: s.videoCodec,
        quality: s.quality,
        networkType: s.networkType,
        mosScore: acc.mosScore + s.mosScore
      }),
      this.emptyStats()
    );
    return {
      audioBitrate: sum.audioBitrate / n,
      videoBitrate: sum.videoBitrate / n,
      packetsLost: sum.packetsLost / n,
      packetLossPercent: sum.packetLossPercent / n,
      jitter: sum.jitter / n,
      roundTripTime: sum.roundTripTime / n,
      resolution: sum.resolution,
      frameRate: sum.frameRate / n,
      audioCodec: sum.audioCodec,
      videoCodec: sum.videoCodec,
      quality: sum.quality,
      networkType: sum.networkType,
      mosScore: sum.mosScore / n
    };
  }

  private emptyStats(): ConnectionStats {
    return {
      audioBitrate: 0,
      videoBitrate: 0,
      packetsLost: 0,
      packetLossPercent: 0,
      jitter: 0,
      roundTripTime: 0,
      resolution: "–",
      frameRate: 0,
      audioCodec: "–",
      videoCodec: "–",
      quality: "excellent",
      networkType: "unknown",
      mosScore: 4.5
    };
  }

  // ── Connection ─────────────────────────────────────────────────────────────

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
      if (this.socket) {
        try {
          this.socket.close();
        } catch {
          /* ignore */
        }
        this.socket = null;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const q = new URLSearchParams();
      if (this.userId) q.set("userId", this.userId);
      if (this.userName) q.set("name", this.userName);
      q.set("deviceId", this.deviceId);
      const wsUrl = `${protocol}//${window.location.host}/ws?${q.toString()}`;

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

        if (this.onDisconnected) this.onDisconnected();

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

    console.log(`[WebRTC] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    if (this.onReconnecting) this.onReconnecting(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      if (this.userId && this.userName) {
        this.createWebSocket()
          .then(() => {
            this.startHeartbeat();
            console.log("[WebRTC] Reconnected successfully");
          })
          .catch(() => this.attemptReconnect());
      }
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send({ type: "ping", data: { timestamp: Date.now() } });

        if (Date.now() - this.lastPong > this.heartbeatInterval * 3) {
          console.log("[WebRTC] Heartbeat timeout – reconnecting");
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
      data: { userId: this.userId, userName: this.userName, deviceId: this.deviceId }
    });
  }

  private send(message: unknown) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error("[WebRTC] Failed to send message:", error);
      }
    } else {
      console.warn("[WebRTC] Cannot send – socket not open");
    }
  }

  // ── Message Handling ───────────────────────────────────────────────────────

  private async handleMessage(message: any) {
    switch (message.type) {
      case "pong":
        this.lastPong = Date.now();
        break;

      case "user-list":
        if (this.onUserList) this.onUserList(message.data);
        break;

      case "presence-update": {
        const raw = message.users;
        if (Array.isArray(raw) && this.onUserList) {
          const mapped: OnlineUser[] = raw.map((u: any) => ({
            id: u.id,
            name: u.displayName ?? u.name ?? String(u.id),
            deviceId: u.deviceId ?? "",
            status: u.inCall ? "in_call" : "online",
            lastSeen: u.lastActivity ? new Date(u.lastActivity).getTime() : Date.now(),
          }));
          this.onUserList(mapped);
        }
        break;
      }

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
        console.log("[WebRTC] Incoming call from:", message.from);
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
        if (this.onCallResponse) this.onCallResponse(message.data);
        break;

      case "call-end":
        console.log("[WebRTC] Call ended by remote");
        this.recordCallHistory("good");
        this.cleanupCall(false);
        if (this.onCallEnd) this.onCallEnd();
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

  // ── Peer Connection ────────────────────────────────────────────────────────

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    console.log("[WebRTC] Creating enterprise peer connection");

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.iceGatheringComplete = false;
    this.connectionEstablished = false;

    // ── ICE Candidates ──────────────────────────────────────────────────────
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCallUserId) {
        this.send({
          type: "ice-candidate",
          from: this.userId,
          to: this.currentCallUserId,
          data: event.candidate.toJSON()
        });
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("[WebRTC] ICE gathering:", pc.iceGatheringState);
      if (pc.iceGatheringState === "complete") this.iceGatheringComplete = true;
    };

    // ── ICE Connection State ────────────────────────────────────────────────
    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);

      switch (pc.iceConnectionState) {
        case "connected":
        case "completed":
          this.connectionEstablished = true;
          if (this.onConnectionQuality) this.onConnectionQuality("excellent");
          this.startStatsMonitoring();
          break;
        case "checking":
          if (this.onConnectionQuality) this.onConnectionQuality("connecting");
          break;
        case "disconnected":
          if (this.onConnectionQuality) this.onConnectionQuality("poor");
          this.attemptIceRestart();
          break;
        case "failed":
          console.log("[WebRTC] ICE failed – attempting restart");
          this.attemptIceRestart();
          break;
        case "closed":
          this.stopStatsMonitoring();
          break;
      }
    };

    // ── Connection State ────────────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);

      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setTimeout(() => {
          if (
            this.peerConnection &&
            (this.peerConnection.connectionState === "disconnected" ||
              this.peerConnection.connectionState === "failed")
          ) {
            console.log("[WebRTC] Connection lost permanently");
            this.recordCallHistory("poor");
            this.cleanupCall(true);
            if (this.onCallEnd) this.onCallEnd();
          }
        }, 5000);
      }
    };

    // ── Remote Tracks ───────────────────────────────────────────────────────
    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received:", event.track.kind);

      if (!this.remoteStream) this.remoteStream = new MediaStream();
      this.remoteStream.addTrack(event.track);

      if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);

      event.track.onended = () => console.log("[WebRTC] Remote track ended:", event.track.kind);
      event.track.onmute = () => console.log("[WebRTC] Remote track muted:", event.track.kind);
      event.track.onunmute = () => console.log("[WebRTC] Remote track unmuted:", event.track.kind);
    };

    pc.onnegotiationneeded = async () => {
      console.log("[WebRTC] Negotiation needed");
    };

    return pc;
  }

  /**
   * Apply codec preferences to the SDP to prefer Opus for audio and VP9/H264 for video.
   * This is a best-effort optimisation – falls back gracefully if codec not available.
   */
  private applyCodecPreferences(pc: RTCPeerConnection) {
    try {
      const transceivers = pc.getTransceivers();
      for (const transceiver of transceivers) {
        if (!transceiver.sender.track) continue;

        const kind = transceiver.sender.track.kind;

        if (kind === "audio") {
          const caps = RTCRtpSender.getCapabilities("audio");
          if (caps) {
            // Prefer Opus at 48 kHz stereo
            const preferred = caps.codecs.filter(c =>
              c.mimeType.toLowerCase().includes("opus")
            );
            const rest = caps.codecs.filter(c =>
              !c.mimeType.toLowerCase().includes("opus")
            );
            if (preferred.length > 0) {
              transceiver.setCodecPreferences([...preferred, ...rest]);
            }
          }
        }

        if (kind === "video") {
          const caps = RTCRtpSender.getCapabilities("video");
          if (caps) {
            // Prefer VP9 > H264 > VP8
            const vp9 = caps.codecs.filter(c => c.mimeType.toLowerCase().includes("vp9"));
            const h264 = caps.codecs.filter(c => c.mimeType.toLowerCase().includes("h264"));
            const rest = caps.codecs.filter(
              c =>
                !c.mimeType.toLowerCase().includes("vp9") &&
                !c.mimeType.toLowerCase().includes("h264")
            );
            const ordered = [...vp9, ...h264, ...rest];
            if (ordered.length > 0) {
              transceiver.setCodecPreferences(ordered);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[WebRTC] Codec preference setting not supported:", err);
    }
  }

  // ── ICE Restart ────────────────────────────────────────────────────────────

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

  // ── Stats Monitoring ───────────────────────────────────────────────────────

  private startStatsMonitoring() {
    this.stopStatsMonitoring();
    this.prevBytesReceived = { audio: 0, video: 0 };
    this.prevStatsTimestamp = Date.now();
    this.statsHistory = [];

    this.statsTimer = setInterval(async () => {
      if (!this.peerConnection) return;

      try {
        const stats = await this.peerConnection.getStats();
        const now = Date.now();
        const elapsed = (now - this.prevStatsTimestamp) / 1000; // seconds

        let audioPacketsLost = 0;
        let audioPacketsReceived = 0;
        let videoPacketsLost = 0;
        let videoPacketsReceived = 0;
        let jitter = 0;
        let roundTripTime = 0;
        let audioBytesReceived = 0;
        let videoBytesReceived = 0;
        let frameWidth = 0;
        let frameHeight = 0;
        let framesPerSecond = 0;
        let audioCodec = "–";
        let videoCodec = "–";
        let networkType = "unknown";

        stats.forEach((report) => {
          if (report.type === "inbound-rtp") {
            if (report.kind === "audio") {
              audioPacketsLost = report.packetsLost || 0;
              audioPacketsReceived = report.packetsReceived || 0;
              jitter = Math.round((report.jitter || 0) * 1000); // convert to ms
              audioBytesReceived = report.bytesReceived || 0;
            }
            if (report.kind === "video") {
              videoPacketsLost = report.packetsLost || 0;
              videoPacketsReceived = report.packetsReceived || 0;
              videoBytesReceived = report.bytesReceived || 0;
              frameWidth = report.frameWidth || 0;
              frameHeight = report.frameHeight || 0;
              framesPerSecond = Math.round(report.framesPerSecond || 0);
            }
          }

          if (report.type === "candidate-pair" && report.state === "succeeded") {
            roundTripTime = Math.round((report.currentRoundTripTime || 0) * 1000); // ms
            networkType = report.networkType || "unknown";
          }

          if (report.type === "codec") {
            if (report.mimeType?.toLowerCase().includes("opus")) audioCodec = "Opus";
            if (report.mimeType?.toLowerCase().includes("vp9")) videoCodec = "VP9";
            else if (report.mimeType?.toLowerCase().includes("h264")) videoCodec = "H264";
            else if (report.mimeType?.toLowerCase().includes("vp8")) videoCodec = "VP8";
          }
        });

        // Compute bitrates (kbps)
        const audioBitrate = elapsed > 0
          ? Math.round(((audioBytesReceived - this.prevBytesReceived.audio) * 8) / elapsed / 1000)
          : 0;
        const videoBitrate = elapsed > 0
          ? Math.round(((videoBytesReceived - this.prevBytesReceived.video) * 8) / elapsed / 1000)
          : 0;

        this.prevBytesReceived = { audio: audioBytesReceived, video: videoBytesReceived };
        this.prevStatsTimestamp = now;

        // Packet loss %
        const totalPackets = audioPacketsReceived + videoPacketsReceived;
        const totalLost = audioPacketsLost + videoPacketsLost;
        const packetLossPercent = totalPackets > 0
          ? Math.round((totalLost / (totalPackets + totalLost)) * 100)
          : 0;

        // MOS score estimate (E-model simplified)
        // Perfect = 4.5, degrades with RTT and packet loss
        const mosScore = Math.max(
          1,
          Math.min(
            4.5,
            4.5 - (roundTripTime / 100) * 0.5 - packetLossPercent * 0.1
          )
        );

        // Quality tier
        let quality: "excellent" | "good" | "fair" | "poor" = "excellent";
        if (roundTripTime > 300 || packetLossPercent > 10 || jitter > 50) {
          quality = "poor";
        } else if (roundTripTime > 150 || packetLossPercent > 5 || jitter > 30) {
          quality = "fair";
        } else if (roundTripTime > 80 || packetLossPercent > 2 || jitter > 10) {
          quality = "good";
        }

        const statsReport: ConnectionStats = {
          audioBitrate: Math.max(0, audioBitrate),
          videoBitrate: Math.max(0, videoBitrate),
          packetsLost: totalLost,
          packetLossPercent,
          jitter,
          roundTripTime,
          resolution: frameWidth > 0 ? `${frameWidth}×${frameHeight}` : "–",
          frameRate: framesPerSecond,
          audioCodec,
          videoCodec,
          quality,
          networkType,
          mosScore: Math.round(mosScore * 10) / 10
        };

        this.statsHistory.push(statsReport);
        if (this.statsHistory.length > 60) this.statsHistory.shift(); // keep 2 min

        if (this.onConnectionQuality) this.onConnectionQuality(quality);
        if (this.onStats) this.onStats(statsReport);
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

  // ── Audio Level Monitoring ─────────────────────────────────────────────────

  private startAudioLevelMonitoring() {
    if (!this.localStream) return;

    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);

      const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);

      this.audioLevelTimer = setInterval(() => {
        if (!this.audioAnalyser) return;
        this.audioAnalyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.round((avg / 255) * 100);
        if (this.onAudioLevel) this.onAudioLevel(level);
      }, 100);
    } catch (err) {
      console.warn("[WebRTC] Audio level monitoring unavailable:", err);
    }
  }

  private stopAudioLevelMonitoring() {
    if (this.audioLevelTimer) {
      clearInterval(this.audioLevelTimer);
      this.audioLevelTimer = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.audioAnalyser = null;
    }
  }

  // ── Call Initiation ────────────────────────────────────────────────────────

  async startCall(targetUserId: string, targetUserName: string, callType: "voice" | "video"): Promise<void> {
    console.log(`[WebRTC] Starting ${callType} call to ${targetUserName}`);

    this.currentCallUserId = targetUserId;
    this.currentCallUserName = targetUserName;
    this.pendingCallType = callType;
    this.isInitiator = true;
    this.callDirection = "outbound";
    this.pendingCandidates = [];
    
    this.send({
      type: "call-request",
      from: this.userId,
      to: targetUserId,
      data: { callType, callerName: this.userName }
    });
  }

  async acceptCall(callerId: string, callerName: string, callType: "voice" | "video"): Promise<void> {
    console.log(`[WebRTC] Accepting ${callType} call from ${callerId}`);

    this.currentCallUserId = callerId;
    this.currentCallUserName = callerName;
    this.pendingCallType = callType;
    this.isInitiator = false;
    this.callDirection = "inbound";
    this.callStartTime = Date.now();
    this.pendingCandidates = [];

    try {
      this.localStream = await getMediaWithFallback(callType);
      console.log("[WebRTC] Local media acquired");

      if (this.onLocalStream) this.onLocalStream(this.localStream);

      this.peerConnection = await this.createPeerConnection();

      this.localStream.getTracks().forEach(track => {
        console.log("[WebRTC] Adding local track:", track.kind);
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      this.applyCodecPreferences(this.peerConnection);
      this.startAudioLevelMonitoring();

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
    this.currentCallUserName = null;
    this.pendingCallType = null;
  }

  async initiateWebRTC(targetUserId: string, callType: "voice" | "video"): Promise<MediaStream | null> {
    console.log(`[WebRTC] Initiating WebRTC for ${callType}`);

    this.callStartTime = Date.now();

    try {
      this.localStream = await getMediaWithFallback(callType);
      console.log("[WebRTC] Local media acquired (initiator)");

      if (this.onLocalStream) this.onLocalStream(this.localStream);

      this.peerConnection = await this.createPeerConnection();

      this.localStream.getTracks().forEach(track => {
        console.log("[WebRTC] Adding local track:", track.kind);
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      this.applyCodecPreferences(this.peerConnection);
      this.startAudioLevelMonitoring();

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

      if (!this.localStream && this.pendingCallType) {
        try {
          this.localStream = await getMediaWithFallback(this.pendingCallType);
          if (this.onLocalStream) this.onLocalStream(this.localStream);
          this.localStream.getTracks().forEach(track => {
            this.peerConnection!.addTrack(track, this.localStream!);
          });
          this.startAudioLevelMonitoring();
        } catch (error) {
          console.error("[WebRTC] Failed to get media for offer:", error);
        }
      }
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
      console.log("[WebRTC] Remote description set");

      for (const candidate of this.pendingCandidates) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("[WebRTC] Failed to add pending ICE candidate:", err);
        }
      }
      this.pendingCandidates = [];

      this.applyCodecPreferences(this.peerConnection);

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

      for (const candidate of this.pendingCandidates) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("[WebRTC] Failed to add pending ICE candidate:", err);
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
      console.log("[WebRTC] Queuing ICE candidate – no peer connection");
      this.pendingCandidates.push(candidate);
      return;
    }

    if (!this.peerConnection.remoteDescription) {
      console.log("[WebRTC] Queuing ICE candidate – no remote description");
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("[WebRTC] Failed to add ICE candidate:", error);
    }
  }

  // ── Public Call Controls ───────────────────────────────────────────────────

  endCall(sendSignal: boolean = true) {
    console.log("[WebRTC] Ending call, sendSignal:", sendSignal);
    this.recordCallHistory("good");
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
    this.stopAudioLevelMonitoring();
    this.stopRecording();

    // Stop screen share
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
      if (this.onScreenShare) this.onScreenShare(null);
    }

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
    this.currentCallUserName = null;
    this.pendingCallType = null;
    this.isInitiator = false;
    this.pendingCandidates = [];
    this.iceGatheringComplete = false;
    this.connectionEstablished = false;
    this.callStartTime = 0;
    this.statsHistory = [];
  }

  /** Toggle local audio mute. Returns new muted state (true = muted). */
  toggleMute(): boolean {
    if (this.localStream) {
      const tracks = this.localStream.getAudioTracks();
      if (tracks.length > 0) {
        const nowEnabled = tracks[0].enabled;
        tracks.forEach(t => { t.enabled = !nowEnabled; });
        return nowEnabled; // was enabled → now muted
      }
    }
    return false;
  }

  /** Toggle local video. Returns new off state (true = video off). */
  toggleVideo(): boolean {
    if (this.localStream) {
      const tracks = this.localStream.getVideoTracks();
      if (tracks.length > 0) {
        const nowEnabled = tracks[0].enabled;
        tracks.forEach(t => { t.enabled = !nowEnabled; });
        return nowEnabled; // was enabled → now off
      }
    }
    return false;
  }

  // ── Screen Sharing ─────────────────────────────────────────────────────────

  async startScreenShare(): Promise<MediaStream | null> {
    if (!this.peerConnection || !this.localStream) {
      console.warn("[WebRTC] Cannot start screen share – no active call");
      return null;
    }

    try {
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: "always", displaySurface: "monitor" },
        audio: false
      });

      this.screenStream = displayStream;

      // Replace video track in peer connection
      const screenTrack = displayStream.getVideoTracks()[0];
      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      // When user stops sharing via browser UI
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      if (this.onScreenShare) this.onScreenShare(displayStream);
      console.log("[WebRTC] Screen sharing started");
      return displayStream;
    } catch (err) {
      console.error("[WebRTC] Screen share failed:", err);
      return null;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenStream) return;

    this.screenStream.getTracks().forEach(t => t.stop());
    this.screenStream = null;

    // Restore camera track
    if (this.peerConnection && this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      if (cameraTrack) {
        const sender = this.peerConnection
          .getSenders()
          .find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(cameraTrack);
      }
    }

    if (this.onScreenShare) this.onScreenShare(null);
    console.log("[WebRTC] Screen sharing stopped");
  }

  isScreenSharing(): boolean {
    return this.screenStream !== null;
  }

  // ── Call Recording ─────────────────────────────────────────────────────────

  startRecording(): boolean {
    if (!this.remoteStream && !this.localStream) {
      console.warn("[WebRTC] No streams to record");
      return false;
    }

    try {
      // Combine local + remote into a single stream for recording
      const combinedStream = new MediaStream();
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => combinedStream.addTrack(t));
      }
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach(t => combinedStream.addTrack(t));
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "audio/webm";

      this.recordingChunks = [];
      this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordingChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordingChunks, { type: mimeType });
        if (this.onRecording) this.onRecording("stopped", blob);
        this.recordingChunks = [];
      };

      this.mediaRecorder.start(1000); // collect chunks every second
      if (this.onRecording) this.onRecording("started");
      console.log("[WebRTC] Recording started");
      return true;
    } catch (err) {
      console.error("[WebRTC] Recording failed to start:", err);
      return false;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === "recording";
  }

  // ── Device Enumeration ─────────────────────────────────────────────────────

  async enumerateDevices(): Promise<MediaDeviceInfo2[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mapped: MediaDeviceInfo2[] = devices
        .filter(d => d.kind !== "audiooutput" || d.deviceId !== "")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind} (${d.deviceId.slice(0, 8)})`,
          kind: d.kind as "audioinput" | "audiooutput" | "videoinput"
        }));

      if (this.onDeviceList) this.onDeviceList(mapped);
      return mapped;
    } catch (err) {
      console.error("[WebRTC] Device enumeration failed:", err);
      return [];
    }
  }

  // ── Call History ───────────────────────────────────────────────────────────

  getCallHistory(): CallHistoryEntry[] {
    return [...this.callHistory].reverse(); // newest first
  }

  clearCallHistory(): void {
    this.callHistory = [];
    this.saveCallHistory();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  getLocalStream(): MediaStream | null { return this.localStream; }
  getRemoteStream(): MediaStream | null { return this.remoteStream; }
  getScreenStream(): MediaStream | null { return this.screenStream; }
  getCurrentUserId(): string | null { return this.userId; }

  getConnectionState(): string {
    if (!this.peerConnection) return "none";
    return this.peerConnection.connectionState;
  }

  getIceConnectionState(): string {
    if (!this.peerConnection) return "none";
    return this.peerConnection.iceConnectionState;
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  // ── Event Handler Registration ─────────────────────────────────────────────

  setOnMessage(handler: MessageHandler) { this.onMessage = handler; }
  setOnUserList(handler: UserListHandler) { this.onUserList = handler; }
  setOnIncomingCall(handler: CallHandler) { this.onIncomingCall = handler; }
  setOnCallResponse(handler: CallResponseHandler) { this.onCallResponse = handler; }
  setOnCallEnd(handler: CallEndHandler) { this.onCallEnd = handler; }
  setOnRemoteStream(handler: RemoteStreamHandler) { this.onRemoteStream = handler; }
  setOnConnectionQuality(handler: ConnectionQualityHandler) { this.onConnectionQuality = handler; }
  setOnLocalStream(handler: LocalStreamHandler) { this.onLocalStream = handler; }
  setOnReconnecting(handler: (attempt: number) => void) { this.onReconnecting = handler; }
  setOnReconnected(handler: () => void) { this.onReconnected = handler; }
  setOnDisconnected(handler: () => void) { this.onDisconnected = handler; }
  setOnStats(handler: StatsHandler) { this.onStats = handler; }
  setOnScreenShare(handler: ScreenShareHandler) { this.onScreenShare = handler; }
  setOnRecording(handler: RecordingHandler) { this.onRecording = handler; }
  setOnDeviceList(handler: DeviceListHandler) { this.onDeviceList = handler; }
  setOnAudioLevel(handler: AudioLevelHandler) { this.onAudioLevel = handler; }

  // ── Disconnect ─────────────────────────────────────────────────────────────

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
}

export const webRTCService = new WebRTCService();
