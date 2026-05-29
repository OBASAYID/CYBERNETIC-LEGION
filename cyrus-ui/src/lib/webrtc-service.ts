import {
  systemFetch,
  resolveCyrusWebSocketUrl,
  appendCommSignalingTokenToSearchParams,
} from "@/lib/system-api";
import { GroupMeshSession, GROUP_CALL_MAX_MEMBERS, type GroupInvitePayload } from "@/lib/group-mesh";

export type { GroupInvitePayload } from "@/lib/group-mesh";
export { GROUP_CALL_MAX_MEMBERS } from "@/lib/group-mesh";

// WebRTC Service for Voice and Video Calls
// Enterprise-Grade Real-Time Communication System
// Terrestrial + NTN/satellite-aware: fetches `/api/cyrus-comm/config/webrtc`, merges ICE,
// applies outbound encoding caps (WhatsApp-class congestion friendliness on constrained paths).

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
  /** Optional chat/profile photo for UI surfaces (e.g. CallDialog). */
  profileImageUrl?: string | null;
}

export interface CommAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
  /** Inferred category for UI (image, video, audio, ebook, model3d, file). */
  kind?: "image" | "video" | "audio" | "ebook" | "model3d" | "file";
}

/** Classify shared files for Communication UI (photos, clips, books, CAD, audio). */
export function inferCommAttachmentKind(mimeType: string, fileName: string): NonNullable<CommAttachment["kind"]> {
  const m = (mimeType || "").toLowerCase();
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (
    m.includes("pdf") ||
    ext === "pdf" ||
    ext === "epub" ||
    ext === "mobi" ||
    ext === "azw3" ||
    m.includes("epub")
  ) {
    return "ebook";
  }
  const modelExt = new Set(["stl", "step", "stp", "obj", "3mf", "glb", "gltf", "dae", "fbx", "x3d", "ply", "3ds"]);
  if (modelExt.has(ext) || m.includes("model") || m.includes("stl") || m.includes("step")) return "model3d";
  return "file";
}

export interface ChatMessage {
  from: string;
  to: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
  attachment?: CommAttachment;
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

/**
 * How long we tolerate `connectionState === "disconnected"` before auto-hangup.
 * Short values kill otherwise healthy long calls (Chrome often blips "disconnected").
 * Target: stable sessions up to ~1 hour on normal networks.
 */
const PEER_DISCONNECTED_GRACE_MS = 50 * 60 * 1000; // 50 min (terrestrial)
const PEER_DISCONNECTED_GRACE_MS_SATELLITE = 55 * 60 * 1000; // 55 min (NTN / satellite IP)
/** After sustained "failed", give ICE restart time before tearing down. */
const PEER_FAILED_GRACE_MS = 10 * 60 * 1000; // 10 min
const PEER_FAILED_GRACE_MS_SATELLITE = 12 * 60 * 1000; // 12 min

// ─── ICE / TURN Configuration ─────────────────────────────────────────────────

/**
 * Embedded STUN/TURN when API is down — merged after `GET /api/cyrus-comm/config/webrtc`.
 * Covers symmetric NAT, firewalls, and IP-based satellite backhaul (Starlink / VSAT / NTN).
 */
const EMBEDDED_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.stunprotocol.org:3478" },
  { urls: "stun:stun.voip.blackberry.com:3478" },
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
];

function mergeIceServers(primary: RTCIceServer[], secondary: RTCIceServer[]): RTCIceServer[] {
  const seen = new Set<string>();
  const out: RTCIceServer[] = [];
  for (const list of [primary, secondary]) {
    for (const s of list) {
      const key = JSON.stringify(s.urls) + String(s.username ?? "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

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
  callType: "voice" | "video",
  linkProfile: "terrestrial" | "satellite" = "terrestrial"
): Promise<MediaStreamConstraints> => {
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  };

  if (callType === "voice") {
    return { audio: audioConstraints, video: false };
  }

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
  const sat = linkProfile === "satellite";

  // NTN / satellite IP: lower capture rate and resolution to match constrained uplink and high RTT.
  const videoConstraints: MediaTrackConstraints = sat
    ? {
        width: { ideal: 640, min: 320 },
        height: { ideal: 360, min: 180 },
        frameRate: { ideal: 12, max: 15 },
        facingMode: "user"
      }
    : mobile
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
const getMediaWithFallback = async (
  callType: "voice" | "video",
  linkProfile: "terrestrial" | "satellite" = "terrestrial"
): Promise<MediaStream> => {
  const constraints = await getMediaConstraints(callType, linkProfile);

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn("[WebRTC] Ideal constraints failed, trying SD fallback:", err);

    const sat = linkProfile === "satellite";
    const sdConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: callType === "video"
        ? sat
          ? { width: { ideal: 426 }, height: { ideal: 240 }, frameRate: { ideal: 10, max: 12 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } }
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

/** Avoid `new RTCIceCandidate()` on socket payloads — ctor throws "Expect line: candidate:" if malformed. */
function normalizeIceCandidateInit(raw: unknown): RTCIceCandidateInit | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candVal = o.candidate;
  if (candVal !== null && typeof candVal !== "string") return null;
  const c = candVal as string | undefined | null;
  if (c == null || c === "") return null;
  if (!c.startsWith("candidate:")) return null;
  const init: RTCIceCandidateInit = { candidate: c };
  if (typeof o.sdpMid === "string" || o.sdpMid === null) init.sdpMid = o.sdpMid as string | null;
  if (typeof o.sdpMLineIndex === "number") init.sdpMLineIndex = o.sdpMLineIndex;
  if (typeof o.usernameFragment === "string") init.usernameFragment = o.usernameFragment;
  return init;
}

async function addIceCandidateLoose(pc: RTCPeerConnection, raw: unknown): Promise<void> {
  const init = normalizeIceCandidateInit(raw);
  if (!init) return;
  try {
    await pc.addIceCandidate(init);
  } catch (e) {
    console.warn("[WebRTC] addIceCandidate failed (ignored):", e);
  }
}

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
  /** ICE from `GET /api/cyrus-comm/config/webrtc` (TURN from env), merged with {@link EMBEDDED_ICE_SERVERS}. */
  private remoteIceServers: RTCIceServer[] | null = null;
  /** Terrestrial vs NTN/satellite IP — drives capture, encoding caps, and hangup windows. */
  private linkProfile: "terrestrial" | "satellite" = "terrestrial";

  /** Full-mesh group call (≤10) — mutually exclusive with {@link peerConnection} 1:1 call. */
  private groupMesh: GroupMeshSession | null = null;
  private readonly groupSignalQueue: Record<string, unknown>[] = [];
  private onIncomingGroupInviteHandler: ((d: GroupInvitePayload & { from: string }) => void) | null = null;
  private onGroupRemoteStreamHandler: ((peerId: string, stream: MediaStream) => void) | null = null;

  // ── Reconnection / Heartbeat ───────────────────────────────────────────────
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  /** Application ping interval; keep below common proxy idle timeouts (~60s). */
  private heartbeatInterval: number = 20000;
  private lastPong: number = Date.now();
  /** Min ms between ICE restart offers (initiator) to avoid signaling storms. */
  private iceRestartCooldownUntil: number = 0;
  private pendingIceRestartTimer: ReturnType<typeof setTimeout> | null = null;
  private callTeardownTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.userId = userId;
    this.userName = userName;
    return this.loadRemoteWebRtcConfig()
      .catch((err) => {
        console.warn("[WebRTC] Remote ICE / link config unavailable — embedded ICE only:", err);
      })
      .then(() => this.createWebSocket())
      .then(() => {
        this.startHeartbeat();
      });
  }

  /**
   * Select terrestrial vs satellite/NTN-style backhaul for the next session.
   * Persists `localStorage.cyrus_comm_link_profile` and selects `?link=satellite` on config fetch.
   */
  setCommLinkProfile(profile: "terrestrial" | "satellite" | "ntn"): void {
    const normalized = profile === "ntn" ? "satellite" : profile;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("cyrus_comm_link_profile", normalized);
      }
    } catch {
      /* quota */
    }
    this.linkProfile = normalized === "satellite" ? "satellite" : "terrestrial";
  }

  getCommLinkProfile(): "terrestrial" | "satellite" {
    return this.linkProfile;
  }

  private async loadRemoteWebRtcConfig(): Promise<void> {
    let storagePref: "terrestrial" | "satellite" = "terrestrial";
    try {
      const ls = typeof localStorage !== "undefined" ? localStorage.getItem("cyrus_comm_link_profile") : null;
      if (ls === "satellite" || ls === "ntn") storagePref = "satellite";
    } catch {
      /* ignore */
    }

    const url =
      storagePref === "satellite"
        ? "/api/cyrus-comm/config/webrtc?link=satellite"
        : "/api/cyrus-comm/config/webrtc";

    try {
      const res = await systemFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as {
        iceServers?: RTCIceServer[];
        linkHints?: { encodingProfile?: string };
      };

      if (Array.isArray(j.iceServers) && j.iceServers.length > 0) {
        this.remoteIceServers = j.iceServers as RTCIceServer[];
      } else {
        this.remoteIceServers = null;
      }

      if (j.linkHints?.encodingProfile === "high_latency_ntn") {
        this.linkProfile = "satellite";
      } else {
        this.linkProfile = storagePref;
      }

      const mergedLen = mergeIceServers(
        this.remoteIceServers ?? [],
        EMBEDDED_ICE_SERVERS
      ).length;
      console.log("[WebRTC] ICE config — link:", this.linkProfile, "candidate servers:", mergedLen);
    } catch {
      this.remoteIceServers = null;
      this.linkProfile = storagePref;
    }
  }

  private createWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        const oldSocket = this.socket;
        oldSocket.onopen = null;
        oldSocket.onclose = null;
        oldSocket.onerror = null;
        oldSocket.onmessage = null;
        try {
          oldSocket.close(1000, "Socket refresh");
        } catch {
          /* ignore */
        }
        this.socket = null;
      }

      const q = new URLSearchParams();
      if (this.userId) q.set("userId", this.userId);
      if (this.userName) q.set("name", this.userName);
      q.set("deviceId", this.deviceId);
      appendCommSignalingTokenToSearchParams(q);
      const wsUrl = resolveCyrusWebSocketUrl(`/ws?${q.toString()}`);

      console.log("[WebRTC] Connecting to signaling server:", wsUrl);

      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
        this.socket = socket;
      } catch (error) {
        console.error("[WebRTC] Failed to create WebSocket:", error);
        reject(error);
        return;
      }

      let settled = false;
      const settle = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(connectionTimeout);
        if (err) reject(err);
        else resolve();
      };

      const connectionTimeout = setTimeout(() => {
        if (this.socket === socket && socket.readyState !== WebSocket.OPEN) {
          try {
            socket.close();
          } catch {
            /* ignore */
          }
          settle(new Error("Connection timeout"));
        }
      }, 10000);

      socket.onopen = () => {
        if (this.socket !== socket) return;
        console.log("[WebRTC] Connected to signaling server");

        const wasReconnecting = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.lastPong = Date.now();
        this.register();

        if (wasReconnecting && this.onReconnected) {
          console.log("[WebRTC] Reconnection successful");
          this.onReconnected();
        }

        settle();
      };

      socket.onclose = (event) => {
        if (this.socket === socket) {
          this.socket = null;
        }
        if (!settled) {
          settle(new Error(`WebSocket closed (${event.code}) ${event.reason || "no reason"}`));
        }
        console.log("[WebRTC] Disconnected from signaling server", event.code, event.reason);
        this.stopHeartbeat();

        if (this.onDisconnected) this.onDisconnected();

        const shouldReconnect =
          !!this.userId &&
          event.code !== 1000 &&
          event.code !== 1008 && // policy violation (e.g., bad/missing token)
          event.code !== 1002 && // protocol error
          event.code !== 1003;   // unsupported payload
        if (shouldReconnect) {
          this.attemptReconnect();
        }
      };

      socket.onerror = (error) => {
        if (this.socket !== socket) return;
        console.error("[WebRTC] WebSocket error:", error);
        if (!settled) {
          settle(new Error("WebSocket error"));
        }
      };

      socket.onmessage = (event) => {
        if (this.socket !== socket) return;
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
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`[WebRTC] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    if (this.onReconnecting) this.onReconnecting(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
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

        if (Date.now() - this.lastPong > this.heartbeatInterval * 5) {
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
    // Any inbound frame proves the signaling socket is alive (not only `pong`).
    this.lastPong = Date.now();

    switch (message.type) {
      case "pong":
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
            text: typeof message.data?.text === "string" ? message.data.text : "",
            timestamp: typeof message.data?.timestamp === "number" ? message.data.timestamp : Date.now(),
            isOwn: false,
            attachment:
              message.data?.attachment &&
              typeof message.data.attachment === "object" &&
              typeof message.data.attachment.url === "string"
                ? (message.data.attachment as CommAttachment)
                : undefined,
          });
        }
        break;

      case "group-invite": {
        const d = message.data as GroupInvitePayload | undefined;
        if (d?.roomId && Array.isArray(d.memberIds) && this.onIncomingGroupInviteHandler) {
          this.onIncomingGroupInviteHandler({
            from: message.from,
            roomId: d.roomId,
            callType: d.callType === "video" ? "video" : "voice",
            memberIds: d.memberIds,
            hostName: typeof d.hostName === "string" ? d.hostName : "Host",
          });
        }
        break;
      }

      case "group-offer":
      case "group-answer":
      case "group-ice-candidate":
        if (this.groupMesh?.isActive()) {
          await this.groupMesh.handleSignal(message as Record<string, unknown>);
        } else {
          this.groupSignalQueue.push(message as Record<string, unknown>);
        }
        break;

      case "group-end":
        if (this.groupMesh?.isActive()) {
          this.disposeGroupLocal(false);
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
        console.log("[WebRTC] call-response received — from:", message.from, "| accepted:", message.data?.accepted);
        if (message.data.accepted) {
          this.currentCallUserId = message.from;
          if (this.isInitiator && this.pendingCallType) {
            console.log("[WebRTC] call-response — initiating WebRTC as caller, callType:", this.pendingCallType);
            await this.initiateWebRTC(message.from, this.pendingCallType);
          } else {
            console.warn(
              "[WebRTC] call-response — accepted but not initiating WebRTC:",
              "isInitiator:", this.isInitiator,
              "pendingCallType:", this.pendingCallType
            );
          }
        } else {
          console.log("[WebRTC] call-response — call rejected, reason:", message.data?.reason);
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

      case "ice-restart-needed":
        if (this.isInitiator && this.peerConnection && this.currentCallUserId) {
          console.log("[WebRTC] Peer requested ICE restart — sending new offer");
          this.scheduleIceRestart();
        }
        break;
    }
  }

  // ── Peer Connection ────────────────────────────────────────────────────────

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    console.log("[WebRTC] Creating enterprise peer connection");

    const iceServers = this.remoteIceServers?.length
      ? mergeIceServers(this.remoteIceServers, EMBEDDED_ICE_SERVERS)
      : EMBEDDED_ICE_SERVERS;

    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: this.linkProfile === "satellite" ? 18 : 10,
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    });
    this.iceGatheringComplete = false;
    this.connectionEstablished = false;

    // ── ICE Candidates ──────────────────────────────────────────────────────
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCallUserId) {
        const payload =
          typeof event.candidate.toJSON === "function"
            ? event.candidate.toJSON()
            : event.candidate;
        this.send({
          type: "ice-candidate",
          from: this.userId,
          to: this.currentCallUserId,
          data: payload,
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
          this.scheduleIceRestart();
          break;
        case "failed":
          console.log("[WebRTC] ICE failed – attempting restart");
          this.scheduleIceRestart();
          break;
        case "closed":
          this.stopStatsMonitoring();
          break;
      }
    };

    // ── Connection State ────────────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);

      if (pc.connectionState === "connected") {
        if (this.callTeardownTimer) {
          clearTimeout(this.callTeardownTimer);
          this.callTeardownTimer = null;
        }
        return;
      }

      if (this.callTeardownTimer) {
        clearTimeout(this.callTeardownTimer);
        this.callTeardownTimer = null;
      }

      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        const isFailed = pc.connectionState === "failed";
        const sat = this.linkProfile === "satellite";
        const hangupAfterMs = isFailed
          ? sat
            ? PEER_FAILED_GRACE_MS_SATELLITE
            : PEER_FAILED_GRACE_MS
          : sat
            ? PEER_DISCONNECTED_GRACE_MS_SATELLITE
            : PEER_DISCONNECTED_GRACE_MS;
        this.callTeardownTimer = setTimeout(() => {
          this.callTeardownTimer = null;
          if (
            this.peerConnection &&
            (this.peerConnection.connectionState === "disconnected" ||
              this.peerConnection.connectionState === "failed")
          ) {
            console.log("[WebRTC] Connection lost permanently after recovery window");
            this.recordCallHistory("poor");
            this.cleanupCall(true);
            if (this.onCallEnd) this.onCallEnd();
          }
        }, hangupAfterMs);
      }
    };

    // ── Remote Tracks ───────────────────────────────────────────────────────
    pc.ontrack = (event) => {
      console.log(
        "[WebRTC] ontrack fired — kind:", event.track.kind,
        "| readyState:", event.track.readyState,
        "| streams:", event.streams.length,
        "| enabled:", event.track.enabled
      );

      // Prefer the stream the remote peer already associated with this track
      // (event.streams[0]). Fall back to building one manually only when the
      // remote side sent no stream association (rare but possible).
      if (event.streams && event.streams.length > 0) {
        // Use the remote-provided stream directly so all tracks share the same
        // MediaStream object and the browser can manage synchronisation.
        this.remoteStream = event.streams[0];
        console.log(
          "[WebRTC] Using remote stream from event.streams[0] — id:", this.remoteStream.id,
          "| audio tracks:", this.remoteStream.getAudioTracks().length,
          "| video tracks:", this.remoteStream.getVideoTracks().length
        );
      } else {
        // No stream association — build one manually.
        if (!this.remoteStream) this.remoteStream = new MediaStream();
        this.remoteStream.addTrack(event.track);
        console.log(
          "[WebRTC] Built remote stream manually — audio tracks:",
          this.remoteStream.getAudioTracks().length,
          "| video tracks:", this.remoteStream.getVideoTracks().length
        );
      }

      // Ensure the track is enabled (some browsers deliver muted tracks initially).
      if (!event.track.enabled) {
        console.log("[WebRTC] Enabling initially-disabled remote track:", event.track.kind);
        event.track.enabled = true;
      }

      // Always emit a *new* MediaStream snapshot so React useState triggers a
      // re-render even when the underlying stream object is the same reference.
      const snapshot = new MediaStream(this.remoteStream.getTracks());
      console.log(
        "[WebRTC] Emitting remote stream snapshot — audio:", snapshot.getAudioTracks().length,
        "| video:", snapshot.getVideoTracks().length
      );
      if (this.onRemoteStream) this.onRemoteStream(snapshot);

      event.track.onended = () => console.log("[WebRTC] Remote track ended:", event.track.kind);
      event.track.onmute = () => {
        console.log("[WebRTC] Remote track muted:", event.track.kind);
        // Re-emit stream so UI can react to mute state changes.
        if (this.remoteStream && this.onRemoteStream) {
          this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        }
      };
      event.track.onunmute = () => {
        console.log("[WebRTC] Remote track unmuted:", event.track.kind);
        if (this.remoteStream && this.onRemoteStream) {
          this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        }
      };
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
            const vp9 = caps.codecs.filter(c => c.mimeType.toLowerCase().includes("vp9"));
            const h264 = caps.codecs.filter(c => c.mimeType.toLowerCase().includes("h264"));
            const rest = caps.codecs.filter(
              c =>
                !c.mimeType.toLowerCase().includes("vp9") &&
                !c.mimeType.toLowerCase().includes("h264")
            );
            // Satellite / NTN: hardware H.264 first (lower CPU, steadier on thin uplinks).
            const ordered =
              this.linkProfile === "satellite"
                ? [...h264, ...vp9, ...rest]
                : [...vp9, ...h264, ...rest];
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

  /**
   * Outbound RTP caps so browser GCC adapts without overshooting thin uplinks
   * (terrestrial vs NTN / satellite IP).
   */
  private async applyOutboundMediaTuning(pc: RTCPeerConnection, callType: "voice" | "video") {
    const sat = this.linkProfile === "satellite";
    const mobile = isMobile();

    for (const sender of pc.getSenders()) {
      const track = sender.track;
      if (!track) continue;
      try {
        const params = sender.getParameters();
        if (track.kind === "audio") {
          const maxBr = sat ? 48_000 : 64_000;
          const enc =
            params.encodings?.length > 0
              ? params.encodings.map((e) => ({ ...e, maxBitrate: maxBr }))
              : [{ maxBitrate: maxBr }];
          await sender.setParameters({ ...params, encodings: enc });
        } else if (track.kind === "video" && callType === "video") {
          const maxBr = sat ? 900_000 : mobile ? 1_600_000 : 2_500_000;
          const maxFr = sat ? 15 : mobile ? 24 : 30;
          const scale = sat ? 2 : 1;
          const enc =
            params.encodings?.length > 0
              ? params.encodings.map((e, i) =>
                  i === 0
                    ? { ...e, maxBitrate: maxBr, maxFramerate: maxFr, scaleResolutionDownBy: scale }
                    : e
                )
              : [{ maxBitrate: maxBr, maxFramerate: maxFr, scaleResolutionDownBy: scale }];
          await sender.setParameters({
            ...params,
            encodings: enc,
            degradationPreference: sat ? "maintain-framerate" : "balanced"
          });
        }
      } catch (e) {
        console.warn("[WebRTC] Outbound encoding tuning skipped:", e);
      }
    }
  }

  // ── ICE Restart ────────────────────────────────────────────────────────────

  /**
   * Callee asks the caller to send an iceRestart offer; caller runs debounced restart.
   */
  private scheduleIceRestart() {
    if (!this.peerConnection || !this.currentCallUserId || !this.userId) return;

    if (!this.isInitiator) {
      this.send({
        type: "ice-restart-needed",
        from: this.userId,
        to: this.currentCallUserId,
      });
      return;
    }

    const now = Date.now();
    const wait = this.iceRestartCooldownUntil - now;
    if (wait > 0) {
      if (!this.pendingIceRestartTimer) {
        this.pendingIceRestartTimer = setTimeout(() => {
          this.pendingIceRestartTimer = null;
          this.scheduleIceRestart();
        }, wait + 50);
      }
      return;
    }

    this.iceRestartCooldownUntil = now + (this.linkProfile === "satellite" ? 14_000 : 10_000);
    void this.attemptIceRestart();
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

        const sat = this.linkProfile === "satellite";
        const rttScale = sat ? 280 : 100;
        const mosScore = Math.max(
          1,
          Math.min(
            4.5,
            4.5 - (roundTripTime / rttScale) * 0.5 - packetLossPercent * 0.1
          )
        );

        // Quality tier — NTN/satellite: tolerate higher RTT before labeling "poor"
        let quality: "excellent" | "good" | "fair" | "poor" = "excellent";
        const poorRtt = sat ? 750 : 300;
        const fairRtt = sat ? 400 : 150;
        const goodRtt = sat ? 200 : 80;
        const poorJit = sat ? 120 : 50;
        const fairJit = sat ? 70 : 30;
        const goodJit = sat ? 35 : 10;
        if (roundTripTime > poorRtt || packetLossPercent > 10 || jitter > poorJit) {
          quality = "poor";
        } else if (roundTripTime > fairRtt || packetLossPercent > 5 || jitter > fairJit) {
          quality = "fair";
        } else if (roundTripTime > goodRtt || packetLossPercent > 2 || jitter > goodJit) {
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

    if (this.groupMesh?.isActive()) {
      console.warn("[WebRTC] End group call before starting a 1:1 call");
      return;
    }

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
    console.log(`[WebRTC] acceptCall() — type: ${callType}, caller: ${callerId} (${callerName})`);

    if (this.groupMesh?.isActive()) {
      throw new Error("End the group call before accepting a direct call");
    }

    // Reset any stale remote stream from a previous call so ontrack creates a fresh one.
    this.remoteStream = null;

    this.currentCallUserId = callerId;
    this.currentCallUserName = callerName;
    this.pendingCallType = callType;
    this.isInitiator = false;
    this.callDirection = "inbound";
    this.callStartTime = Date.now();
    this.pendingCandidates = [];

    console.log("[WebRTC] acceptCall() — acquiring local media, linkProfile:", this.linkProfile);

    try {
      this.localStream = await getMediaWithFallback(callType, this.linkProfile);

      const audioTracks = this.localStream.getAudioTracks();
      const videoTracks = this.localStream.getVideoTracks();
      console.log(
        "[WebRTC] acceptCall() — local media acquired:",
        `audio tracks: ${audioTracks.length}, video tracks: ${videoTracks.length}`
      );
      audioTracks.forEach(t =>
        console.log(`[WebRTC]   audio track id=${t.id} enabled=${t.enabled} readyState=${t.readyState}`)
      );
      videoTracks.forEach(t =>
        console.log(`[WebRTC]   video track id=${t.id} enabled=${t.enabled} readyState=${t.readyState}`)
      );

      if (this.onLocalStream) this.onLocalStream(this.localStream);

      this.startAudioLevelMonitoring();

      // Defer RTCPeerConnection creation until the caller's offer arrives.
      // Creating a PC + setParameters before setRemoteDescription(offer) breaks
      // negotiation on several browsers (hang / no media).
      console.log("[WebRTC] acceptCall() — sending call-response accepted=true to", callerId);
      this.send({
        type: "call-response",
        from: this.userId,
        to: callerId,
        data: { accepted: true }
      });

      console.log("[WebRTC] acceptCall() — waiting for SDP offer from caller");
    } catch (error) {
      console.error("[WebRTC] acceptCall() — failed to acquire media:", error);
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
    console.log(`[WebRTC] initiateWebRTC() — callType: ${callType}, target: ${targetUserId}`);

    this.callStartTime = Date.now();
    // Reset any stale remote stream so ontrack creates a fresh one.
    this.remoteStream = null;

    try {
      console.log("[WebRTC] initiateWebRTC() — acquiring local media, linkProfile:", this.linkProfile);
      this.localStream = await getMediaWithFallback(callType, this.linkProfile);

      const audioTracks = this.localStream.getAudioTracks();
      const videoTracks = this.localStream.getVideoTracks();
      console.log(
        "[WebRTC] initiateWebRTC() — local media acquired:",
        `audio: ${audioTracks.length}, video: ${videoTracks.length}`
      );
      audioTracks.forEach(t =>
        console.log(`[WebRTC]   audio track id=${t.id} enabled=${t.enabled} readyState=${t.readyState}`)
      );
      videoTracks.forEach(t =>
        console.log(`[WebRTC]   video track id=${t.id} enabled=${t.enabled} readyState=${t.readyState}`)
      );

      if (this.onLocalStream) this.onLocalStream(this.localStream);

      console.log("[WebRTC] initiateWebRTC() — creating peer connection");
      this.peerConnection = await this.createPeerConnection();

      const tracks = this.localStream.getTracks();
      console.log("[WebRTC] initiateWebRTC() — adding", tracks.length, "local tracks to peer connection");
      tracks.forEach(track => {
        console.log("[WebRTC]   adding track:", track.kind, "id:", track.id);
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      this.applyCodecPreferences(this.peerConnection);
      this.startAudioLevelMonitoring();

      console.log("[WebRTC] initiateWebRTC() — creating SDP offer");
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video"
      });

      console.log("[WebRTC] initiateWebRTC() — setting local description (offer)");
      await this.peerConnection.setLocalDescription(offer);
      await this.applyOutboundMediaTuning(this.peerConnection, callType);

      console.log("[WebRTC] initiateWebRTC() — sending offer to", targetUserId);
      this.send({
        type: "offer",
        from: this.userId,
        to: targetUserId,
        data: offer
      });
      console.log("[WebRTC] initiateWebRTC() — offer sent; waiting for answer");

      return this.localStream;
    } catch (error) {
      console.error("[WebRTC] initiateWebRTC() — failed:", error);
      this.cleanupCall(true);
      return null;
    }
  }

  private async handleOffer(message: any) {
    console.log("[WebRTC] handleOffer() — from:", message.from, "| sdp type:", message.data?.type);

    if (!this.peerConnection) {
      console.log("[WebRTC] handleOffer() — no existing PC, creating peer connection");

      // Ensure any stale remote stream is cleared so ontrack builds a fresh one.
      this.remoteStream = null;

      this.peerConnection = await this.createPeerConnection();
      console.log("[WebRTC] handleOffer() — peer connection created");

      if (this.localStream) {
        // Local stream was already acquired in acceptCall() — add all tracks now.
        const tracks = this.localStream.getTracks();
        console.log("[WebRTC] handleOffer() — adding", tracks.length, "pre-acquired local tracks");
        tracks.forEach(track => {
          console.log("[WebRTC]   adding local track:", track.kind, "id:", track.id);
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      } else if (this.pendingCallType) {
        // Fallback: acceptCall() didn't acquire media yet — get it now.
        console.log("[WebRTC] handleOffer() — no local stream, acquiring media for:", this.pendingCallType);
        try {
          this.localStream = await getMediaWithFallback(this.pendingCallType, this.linkProfile);
          console.log(
            "[WebRTC] handleOffer() — fallback media acquired:",
            "audio:", this.localStream.getAudioTracks().length,
            "video:", this.localStream.getVideoTracks().length
          );
          if (this.onLocalStream) this.onLocalStream(this.localStream);
          this.localStream.getTracks().forEach(track => {
            console.log("[WebRTC]   adding fallback local track:", track.kind, "id:", track.id);
            this.peerConnection!.addTrack(track, this.localStream!);
          });
          this.startAudioLevelMonitoring();
        } catch (error) {
          console.error("[WebRTC] handleOffer() — failed to acquire fallback media:", error);
          // Continue without local media — remote stream can still be received.
        }
      } else {
        console.warn("[WebRTC] handleOffer() — no local stream and no pendingCallType; proceeding without local media");
      }
    } else {
      console.log("[WebRTC] handleOffer() — reusing existing peer connection (ICE restart or re-offer)");
    }

    if (!this.peerConnection) {
      console.error("[WebRTC] handleOffer() — peer connection is null after creation attempt; aborting");
      return;
    }

    try {
      console.log("[WebRTC] handleOffer() — setting remote description (offer)");
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
      console.log("[WebRTC] handleOffer() — remote description set successfully");

      // Drain any ICE candidates that arrived before the remote description was ready.
      if (this.pendingCandidates.length > 0) {
        console.log("[WebRTC] handleOffer() — draining", this.pendingCandidates.length, "pending ICE candidates");
        for (const candidate of this.pendingCandidates) {
          await addIceCandidateLoose(this.peerConnection, candidate);
        }
        this.pendingCandidates = [];
        console.log("[WebRTC] handleOffer() — pending ICE candidates drained");
      }

      this.applyCodecPreferences(this.peerConnection);

      console.log("[WebRTC] handleOffer() — creating SDP answer");
      const answer = await this.peerConnection.createAnswer();
      console.log("[WebRTC] handleOffer() — setting local description (answer)");
      await this.peerConnection.setLocalDescription(answer);
      console.log("[WebRTC] handleOffer() — local description set");

      await this.applyOutboundMediaTuning(
        this.peerConnection,
        this.pendingCallType || "voice"
      );

      console.log("[WebRTC] handleOffer() — sending answer to", message.from);
      this.send({
        type: "answer",
        from: this.userId,
        to: message.from,
        data: answer
      });
      console.log("[WebRTC] handleOffer() — answer sent; waiting for ICE negotiation");
    } catch (error) {
      console.error("[WebRTC] handleOffer() — failed:", error);
    }
  }

  private async handleAnswer(message: any) {
    console.log("[WebRTC] handleAnswer() — from:", message.from, "| sdp type:", message.data?.type);

    if (!this.peerConnection) {
      console.error("[WebRTC] handleAnswer() — no peer connection; cannot apply answer");
      return;
    }

    const sigState = this.peerConnection.signalingState;
    console.log("[WebRTC] handleAnswer() — current signalingState:", sigState);

    if (sigState !== "have-local-offer") {
      console.warn(
        "[WebRTC] handleAnswer() — unexpected signalingState:", sigState,
        "— expected 'have-local-offer'; skipping setRemoteDescription"
      );
      return;
    }

    try {
      console.log("[WebRTC] handleAnswer() — setting remote description (answer)");
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
      console.log("[WebRTC] handleAnswer() — remote description set successfully");

      // Drain any ICE candidates that arrived before the remote description was ready.
      if (this.pendingCandidates.length > 0) {
        console.log("[WebRTC] handleAnswer() — draining", this.pendingCandidates.length, "pending ICE candidates");
        for (const candidate of this.pendingCandidates) {
          await addIceCandidateLoose(this.peerConnection, candidate);
        }
        this.pendingCandidates = [];
        console.log("[WebRTC] handleAnswer() — pending ICE candidates drained");
      }

      console.log("[WebRTC] handleAnswer() — ICE negotiation in progress");
    } catch (error) {
      console.error("[WebRTC] handleAnswer() — failed:", error);
    }
  }

  private async handleIceCandidate(message: any) {
    const init = normalizeIceCandidateInit(message.data);
    if (!init) return;

    if (!this.peerConnection) {
      console.log("[WebRTC] Queuing ICE candidate – no peer connection");
      this.pendingCandidates.push(init);
      return;
    }

    if (!this.peerConnection.remoteDescription) {
      console.log("[WebRTC] Queuing ICE candidate – no remote description");
      this.pendingCandidates.push(init);
      return;
    }

    await addIceCandidateLoose(this.peerConnection, init);
  }

  // ── Public Call Controls ───────────────────────────────────────────────────

  endCall(sendSignal: boolean = true) {
    if (this.groupMesh?.isActive()) {
      this.disposeGroupLocal(sendSignal);
      return;
    }
    console.log("[WebRTC] Ending call, sendSignal:", sendSignal);
    this.recordCallHistory("good");
    this.cleanupCall(sendSignal);
  }

  sendTextMessage(toUserId: string, text: string, attachment?: CommAttachment) {
    if (!this.userId) return;
    const line =
      text.trim() ||
      (attachment ? `📎 ${attachment.fileName}` : "");
    if (!line && !attachment) return;
    this.send({
      type: "text-message",
      from: this.userId,
      to: toUserId,
      data: {
        text: line,
        timestamp: Date.now(),
        ...(attachment ? { attachment } : {}),
      },
    });
  }

  private cleanupCall(sendSignal: boolean) {
    if (this.pendingIceRestartTimer) {
      clearTimeout(this.pendingIceRestartTimer);
      this.pendingIceRestartTimer = null;
    }
    if (this.callTeardownTimer) {
      clearTimeout(this.callTeardownTimer);
      this.callTeardownTimer = null;
    }
    this.iceRestartCooldownUntil = 0;

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
    if (this.groupMesh?.isActive()) {
      console.warn("[WebRTC] Group call recording is not supported in this build");
      return false;
    }
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

  setOnIncomingGroupInvite(handler: (d: GroupInvitePayload & { from: string }) => void) {
    this.onIncomingGroupInviteHandler = handler;
  }

  setOnGroupRemoteStream(handler: (peerId: string, stream: MediaStream) => void) {
    this.onGroupRemoteStreamHandler = handler;
  }

  /** Start a mesh group session (host). Max {@link GROUP_CALL_MAX_MEMBERS} including you. */
  async startGroupCall(participants: { id: string; name: string }[], callType: "voice" | "video"): Promise<void> {
    if (!this.userId) throw new Error("Not signed in");
    if (this.peerConnection) throw new Error("Already in a 1:1 call");
    if (this.groupMesh?.isActive()) throw new Error("Already in a group call");

    const ids = [this.userId, ...participants.map((p) => p.id)];
    const unique = [...new Set(ids)];
    if (unique.length > GROUP_CALL_MAX_MEMBERS) {
      throw new Error(`Maximum ${GROUP_CALL_MAX_MEMBERS} participants (including you)`);
    }

    const roomId = crypto.randomUUID();
    const memberIds = unique.sort();

    this.groupMesh = new GroupMeshSession(
      roomId,
      this.userId,
      memberIds,
      callType,
      this.linkProfile,
      (m) => this.send(m)
    );
    this.groupMesh.setCallbacks({
      onRemoteStream: (peerId, stream) => this.onGroupRemoteStreamHandler?.(peerId, stream),
      onEnded: () => {
        this.disposeGroupLocal(false);
        if (this.onCallEnd) this.onCallEnd();
      },
    });

    try {
      this.localStream = await getMediaWithFallback(callType, this.linkProfile);
      if (this.onLocalStream) this.onLocalStream(this.localStream);
      this.startAudioLevelMonitoring();

      await this.groupMesh.startWithLocalStream(this.localStream, { offerDelayMs: 1400 });
      await this.flushGroupSignalQueue();

      const payload: GroupInvitePayload = {
        roomId,
        callType,
        memberIds,
        hostName: this.userName || "Host",
      };
      for (const id of memberIds) {
        if (id === this.userId) continue;
        this.send({
          type: "group-invite",
          from: this.userId,
          to: id,
          data: payload,
        });
      }
    } catch (e) {
      this.disposeGroupLocal(false);
      throw e;
    }
  }

  async acceptGroupInvite(invite: GroupInvitePayload & { from: string }): Promise<void> {
    if (!this.userId) throw new Error("Not signed in");
    if (this.peerConnection) throw new Error("Already in a 1:1 call");
    if (this.groupMesh?.isActive()) throw new Error("Already in a group call");
    if (!invite.memberIds.includes(this.userId)) {
      throw new Error("Invalid group invite");
    }

    this.groupMesh = new GroupMeshSession(
      invite.roomId,
      this.userId,
      invite.memberIds,
      invite.callType,
      this.linkProfile,
      (m) => this.send(m)
    );
    this.groupMesh.setCallbacks({
      onRemoteStream: (peerId, stream) => this.onGroupRemoteStreamHandler?.(peerId, stream),
      onEnded: () => {
        this.disposeGroupLocal(false);
        if (this.onCallEnd) this.onCallEnd();
      },
    });

    try {
      this.localStream = await getMediaWithFallback(invite.callType, this.linkProfile);
      if (this.onLocalStream) this.onLocalStream(this.localStream);
      this.startAudioLevelMonitoring();

      await this.groupMesh.startWithLocalStream(this.localStream);
      await this.flushGroupSignalQueue();
    } catch (e) {
      this.disposeGroupLocal(false);
      throw e;
    }
  }

  rejectGroupInvite(fromHostId: string, invite: GroupInvitePayload) {
    this.send({
      type: "group-reject",
      from: this.userId,
      to: fromHostId,
      roomId: invite.roomId,
      data: {},
    });
  }

  endGroupCall() {
    this.disposeGroupLocal(true);
  }

  isInGroupCall(): boolean {
    return !!this.groupMesh?.isActive();
  }

  getGroupRemoteStreams(): ReadonlyMap<string, MediaStream> {
    return this.groupMesh?.getRemoteStreams() ?? new Map();
  }

  private disposeGroupLocal(sendGroupEnd: boolean) {
    if (this.groupMesh) {
      this.groupMesh.dispose(sendGroupEnd);
      this.groupMesh = null;
    }
    this.groupSignalQueue.length = 0;
    this.stopAudioLevelMonitoring();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  private async flushGroupSignalQueue() {
    const q = [...this.groupSignalQueue];
    this.groupSignalQueue.length = 0;
    for (const m of q) {
      await this.groupMesh?.handleSignal(m);
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────

  disconnect() {
    console.log("[WebRTC] Disconnecting");

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;

    this.disposeGroupLocal(false);
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
