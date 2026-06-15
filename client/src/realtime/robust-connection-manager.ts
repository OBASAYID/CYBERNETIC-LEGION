/**
 * Robust Connection Manager - Zoom/WhatsApp-grade call stability
 * 
 * Features:
 * - Aggressive TURN relay usage for poor networks
 * - Fast ICE gathering with timeouts
 * - Proactive connection health monitoring
 * - Intelligent reconnection with exponential backoff
 * - Quality-aware media adaptation
 * - Comprehensive error recovery
 */

import type { Socket } from "socket.io-client";
import { buildRtcConfiguration, getRuntimeIceServers, hasTurnRelayInIceServers } from "../lib/webrtc-config";

export interface RobustConnectionConfig {
  /** Callback when connection state changes */
  onStateChange?: (state: RTCPeerConnectionState) => void;
  /** Callback when ICE state changes */
  onIceStateChange?: (state: RTCIceConnectionState) => void;
  /** Callback when reconnection is triggered */
  onReconnecting?: () => void;
  /** Callback when reconnection succeeds */
  onReconnected?: () => void;
  /** Callback when all reconnection attempts fail */
  onFailed?: () => void;
  /** Force use of TURN relay */
  forceRelay?: boolean;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Enable verbose logging */
  debug?: boolean;
}

export interface ConnectionHealthMetrics {
  rtt: number;
  packetsLost: number;
  packetLossRate: number;
  jitter: number;
  bitrate: number;
  quality: "excellent" | "good" | "fair" | "poor" | "critical";
  timestamp: number;
}

const DEFAULT_CONFIG: Required<RobustConnectionConfig> = {
  onStateChange: () => {},
  onIceStateChange: () => {},
  onReconnecting: () => {},
  onReconnected: () => {},
  onFailed: () => {},
  forceRelay: false,
  maxReconnectAttempts: 5,
  debug: false,
};

// Aggressive timeouts for fast failure detection
const ICE_GATHERING_TIMEOUT_MS = 8000; // 8 seconds max for ICE gathering
const ICE_COMPLETE_TIMEOUT_MS = 12000; // 12 seconds for full ICE process
const CONNECTION_TIMEOUT_MS = 15000; // 15 seconds for connection establishment
const HEALTH_CHECK_INTERVAL_MS = 2000; // Check health every 2 seconds
const DISCONNECTION_GRACE_MS = 3000; // Wait 3 seconds before reconnecting
const CRITICAL_QUALITY_THRESHOLD = 3; // Samples in critical state before action

export class RobustConnectionManager {
  private config: Required<RobustConnectionConfig>;
  private peerConnection: RTCPeerConnection | null = null;
  private iceGatheringTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private disconnectionTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private criticalQualitySamples = 0;
  private lastHealthMetrics: ConnectionHealthMetrics | null = null;
  private isReconnecting = false;
  private disposed = false;
  private onIceRestartNeeded?: () => Promise<void>;

  constructor(config: RobustConnectionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a peer connection with robust configuration
   */
  async createPeerConnection(
    iceServers: RTCIceServer[],
    onIceRestartNeeded?: () => Promise<void>,
  ): Promise<RTCPeerConnection> {
    if (this.peerConnection) {
      this.log("Closing existing peer connection");
      this.cleanup();
    }

    this.onIceRestartNeeded = onIceRestartNeeded;
    
    // Determine if we should use relay-only mode
    const useRelayOnly = this.shouldUseRelayOnly(iceServers);
    
    const configuration: RTCConfiguration = {
      iceServers: this.prioritizeRelayServers(iceServers),
      iceTransportPolicy: useRelayOnly ? "relay" : "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceCandidatePoolSize: useRelayOnly ? 8 : 16, // More candidates for direct connections
    };

    this.log("Creating peer connection", { useRelayOnly, serverCount: iceServers.length });
    
    const pc = new RTCPeerConnection(configuration);
    this.peerConnection = pc;
    
    // Set up comprehensive monitoring
    this.setupConnectionMonitoring(pc);
    this.setupIceMonitoring(pc);
    this.startHealthMonitoring();
    
    // Set connection timeout
    this.connectionTimer = setTimeout(() => {
      if (pc.connectionState === "connecting" || pc.iceConnectionState === "checking") {
        this.log("Connection timeout - triggering reconnection");
        this.handleConnectionFailure();
      }
    }, CONNECTION_TIMEOUT_MS);

    return pc;
  }

  /**
   * Monitor connection state with aggressive failure detection
   */
  private setupConnectionMonitoring(pc: RTCPeerConnection): void {
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      this.log(`Connection state: ${state}`);
      this.config.onStateChange(state);

      switch (state) {
        case "connected":
          this.handleConnectionSuccess();
          break;
        case "disconnected":
          this.handleDisconnection();
          break;
        case "failed":
          this.handleConnectionFailure();
          break;
        case "closed":
          this.cleanup();
          break;
      }
    };
  }

  /**
   * Monitor ICE state with fast timeout detection
   */
  private setupIceMonitoring(pc: RTCPeerConnection): void {
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      this.log(`ICE state: ${state}`);
      this.config.onIceStateChange(state);

      switch (state) {
        case "checking":
          // Start ICE gathering timeout
          this.iceGatheringTimer = setTimeout(() => {
            if (pc.iceConnectionState === "checking") {
              this.log("ICE gathering timeout - forcing relay");
              this.escalateToRelay();
            }
          }, ICE_GATHERING_TIMEOUT_MS);
          break;
        case "connected":
        case "completed":
          this.clearIceTimers();
          this.log("ICE connection established");
          break;
        case "disconnected":
          // Give it a few seconds to reconnect
          this.disconnectionTimer = setTimeout(() => {
            if (pc.iceConnectionState === "disconnected") {
              this.log("ICE disconnection timeout - reconnecting");
              this.handleConnectionFailure();
            }
          }, DISCONNECTION_GRACE_MS);
          break;
        case "failed":
          this.handleConnectionFailure();
          break;
      }
    };

    pc.onicegatheringstatechange = () => {
      this.log(`ICE gathering state: ${pc.iceGatheringState}`);
      
      if (pc.iceGatheringState === "complete") {
        this.clearIceTimers();
      }
    };
  }

  /**
   * Start proactive health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.peerConnection || this.disposed) return;

      try {
        const metrics = await this.getConnectionHealth();
        this.lastHealthMetrics = metrics;

        if (metrics.quality === "critical") {
          this.criticalQualitySamples++;
          this.log(`Critical quality detected (${this.criticalQualitySamples}/${CRITICAL_QUALITY_THRESHOLD})`);

          if (this.criticalQualitySamples >= CRITICAL_QUALITY_THRESHOLD) {
            this.log("Persistent critical quality - triggering recovery");
            await this.handlePoorQuality(metrics);
          }
        } else if (metrics.quality === "poor") {
          this.log("Poor quality detected - monitoring");
          // Reset critical counter but keep monitoring
          if (this.criticalQualitySamples > 0) {
            this.criticalQualitySamples = Math.max(0, this.criticalQualitySamples - 1);
          }
        } else {
          // Good quality - reset counter
          this.criticalQualitySamples = 0;
        }
      } catch (error) {
        this.log("Health check error:", error);
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Get current connection health metrics
   */
  private async getConnectionHealth(): Promise<ConnectionHealthMetrics> {
    if (!this.peerConnection) {
      throw new Error("No peer connection");
    }

    const stats = await this.peerConnection.getStats();
    
    let rtt = 0;
    let packetsLost = 0;
    let packetsReceived = 0;
    let jitter = 0;
    let bitrate = 0;

    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        rtt = Math.max(rtt, (report.currentRoundTripTime || 0) * 1000);
      }
      
      if (report.type === "inbound-rtp") {
        packetsLost += report.packetsLost || 0;
        packetsReceived += report.packetsReceived || 0;
        jitter = Math.max(jitter, (report.jitter || 0) * 1000);
      }
      
      if (report.type === "outbound-rtp") {
        bitrate += ((report.bytesSent || 0) * 8) / 1000; // kbps
      }
    });

    const packetLossRate = packetsReceived > 0
      ? (packetsLost / (packetsReceived + packetsLost)) * 100
      : 0;

    let quality: ConnectionHealthMetrics["quality"] = "excellent";
    
    if (packetLossRate > 15 || rtt > 500 || jitter > 100) {
      quality = "critical";
    } else if (packetLossRate > 8 || rtt > 350 || jitter > 60) {
      quality = "poor";
    } else if (packetLossRate > 3 || rtt > 200 || jitter > 30) {
      quality = "fair";
    } else if (packetLossRate > 1 || rtt > 100) {
      quality = "good";
    }

    return {
      rtt,
      packetsLost,
      packetLossRate,
      jitter,
      bitrate,
      quality,
      timestamp: Date.now(),
    };
  }

  /**
   * Handle poor quality with adaptive recovery
   */
  private async handlePoorQuality(metrics: ConnectionHealthMetrics): Promise<void> {
    if (!this.peerConnection || this.isReconnecting) return;

    this.log("Handling poor quality", metrics);

    // Try ICE restart first (faster than full reconnection)
    if (this.onIceRestartNeeded) {
      this.log("Attempting ICE restart for quality recovery");
      try {
        await this.onIceRestartNeeded();
        this.criticalQualitySamples = 0;
        return;
      } catch (error) {
        this.log("ICE restart failed:", error);
      }
    }

    // If ICE restart fails or unavailable, trigger full reconnection
    this.handleConnectionFailure();
  }

  /**
   * Handle disconnection with grace period
   */
  private handleDisconnection(): void {
    if (this.isReconnecting || this.disposed) return;

    this.log("Connection disconnected - waiting for recovery");
    // setupIceMonitoring already sets a timer, just log here
  }

  /**
   * Handle connection success
   */
  private handleConnectionSuccess(): void {
    this.log("Connection established successfully");
    this.reconnectAttempts = 0;
    this.criticalQualitySamples = 0;
    this.isReconnecting = false;
    this.clearTimers();
    
    if (this.config.onReconnected) {
      this.config.onReconnected();
    }
  }

  /**
   * Handle connection failure with intelligent reconnection
   */
  private async handleConnectionFailure(): Promise<void> {
    if (this.isReconnecting || this.disposed) return;

    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      this.log(`Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`);
      this.config.onFailed();
      return;
    }

    this.log(`Connection failed - attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
    this.isReconnecting = true;
    this.config.onReconnecting();

    // Exponential backoff with jitter
    const baseDelay = 1000 * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 500;
    const delay = Math.min(baseDelay + jitter, 10000); // Max 10 seconds

    this.log(`Waiting ${Math.round(delay)}ms before reconnect`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (this.disposed) return;

    // Try ICE restart first (faster)
    if (this.onIceRestartNeeded) {
      try {
        this.log("Attempting ICE restart");
        await this.onIceRestartNeeded();
        this.isReconnecting = false;
        return;
      } catch (error) {
        this.log("ICE restart failed, will retry:", error);
      }
    }

    // If still failing, will retry via handleConnectionFailure called again
    this.isReconnecting = false;
  }

  /**
   * Escalate to relay-only mode if direct connection fails
   */
  private async escalateToRelay(): Promise<void> {
    if (!this.peerConnection || this.config.forceRelay) return;

    this.log("Escalating to TURN relay mode");
    this.config.forceRelay = true;

    // Trigger ICE restart with relay-only
    if (this.onIceRestartNeeded) {
      try {
        await this.onIceRestartNeeded();
      } catch (error) {
        this.log("Relay escalation failed:", error);
      }
    }
  }

  /**
   * Determine if relay-only mode should be used
   */
  private shouldUseRelayOnly(iceServers: RTCIceServer[]): boolean {
    if (this.config.forceRelay) return true;

    // Check if TURN is configured
    if (!hasTurnRelayInIceServers(iceServers)) {
      this.log("No TURN relay available - using all candidates");
      return false;
    }

    // Use relay for cellular/poor networks after first failure
    if (this.reconnectAttempts > 0) {
      this.log("Using relay after connection failure");
      return true;
    }

    // Check network type
    try {
      const connection = (navigator as any).connection;
      if (connection) {
        const type = String(connection.type || "").toLowerCase();
        const effectiveType = String(connection.effectiveType || "").toLowerCase();
        
        if (type === "cellular" || effectiveType === "2g" || effectiveType === "3g") {
          this.log("Cellular/slow network detected - using relay");
          return true;
        }
      }
    } catch {
      // Ignore errors
    }

    return false;
  }

  /**
   * Prioritize TURN relay servers for better connectivity
   */
  private prioritizeRelayServers(servers: RTCIceServer[]): RTCIceServer[] {
    const turn: RTCIceServer[] = [];
    const stun: RTCIceServer[] = [];

    for (const server of servers) {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      const isTurn = urls.some((url) => 
        String(url).startsWith("turn:") || String(url).startsWith("turns:")
      );

      if (isTurn) {
        turn.push(server);
      } else {
        stun.push(server);
      }
    }

    // Return TURN servers first for better connectivity
    return [...turn, ...stun];
  }

  /**
   * Get current connection metrics
   */
  getLastHealthMetrics(): ConnectionHealthMetrics | null {
    return this.lastHealthMetrics;
  }

  /**
   * Get current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Check if currently reconnecting
   */
  isCurrentlyReconnecting(): boolean {
    return this.isReconnecting;
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearIceTimers();
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    if (this.disconnectionTimer) {
      clearTimeout(this.disconnectionTimer);
      this.disconnectionTimer = null;
    }
  }

  /**
   * Clear ICE-specific timers
   */
  private clearIceTimers(): void {
    if (this.iceGatheringTimer) {
      clearTimeout(this.iceGatheringTimer);
      this.iceGatheringTimer = null;
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    if (this.disposed) return;
    
    this.log("Cleaning up connection manager");
    this.disposed = true;
    this.clearTimers();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.peerConnection = null;
    this.onIceRestartNeeded = undefined;
  }

  /**
   * Dispose the manager completely
   */
  dispose(): void {
    this.cleanup();
  }

  /**
   * Log with optional debug flag
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[RobustConnection] ${message}`, ...args);
    }
  }
}
