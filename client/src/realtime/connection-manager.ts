/**
 * Connection state management for CYRUS socket signaling.
 * Provides health checks, reconnection logic, and state tracking.
 */

export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
}

export interface ConnectionMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  reconnectionAttempts: number;
  currentState: ConnectionState;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  totalUptime: number; // milliseconds
  averageConnectionTime: number;
}

export interface ConnectionHealthCheck {
  isHealthy: boolean;
  latencyMs: number;
  lastPingAt: Date | null;
  consecutiveFailures: number;
  connectionQuality: "excellent" | "good" | "poor" | "critical";
}

export class SocketConnectionManager {
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private metrics: ConnectionMetrics;
  private healthCheck: ConnectionHealthCheck;
  private reconnectionTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private readonly MAX_RECONNECTION_ATTEMPTS = 10;
  private readonly BASE_RECONNECTION_DELAY_MS = 1000;
  private readonly MAX_RECONNECTION_DELAY_MS = 30000;
  private readonly PING_INTERVAL_MS = 10000; // Ping every 10 seconds
  private readonly PING_TIMEOUT_MS = 5000;

  constructor() {
    this.metrics = this.initializeMetrics();
    this.healthCheck = this.initializeHealthCheck();
  }

  private initializeMetrics(): ConnectionMetrics {
    return {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectionAttempts: 0,
      currentState: ConnectionState.DISCONNECTED,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      totalUptime: 0,
      averageConnectionTime: 0,
    };
  }

  private initializeHealthCheck(): ConnectionHealthCheck {
    return {
      isHealthy: false,
      latencyMs: 0,
      lastPingAt: null,
      consecutiveFailures: 0,
      connectionQuality: "critical",
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    this.metrics.currentState = newState;

    console.log(`[ConnectionManager] State transition: ${oldState} -> ${newState}`);

    // Update metrics based on state
    if (newState === ConnectionState.CONNECTED) {
      this.metrics.successfulConnections++;
      this.metrics.lastConnectedAt = new Date();
      this.healthCheck.isHealthy = true;
      this.healthCheck.consecutiveFailures = 0;
      this.startPingInterval();
    } else if (newState === ConnectionState.DISCONNECTED || newState === ConnectionState.FAILED) {
      this.metrics.lastDisconnectedAt = new Date();
      this.healthCheck.isHealthy = false;
      this.stopPingInterval();

      if (oldState === ConnectionState.CONNECTED && this.metrics.lastConnectedAt) {
        const uptime = Date.now() - this.metrics.lastConnectedAt.getTime();
        this.metrics.totalUptime += uptime;
      }
    }
  }

  recordConnectionAttempt(): void {
    this.metrics.connectionAttempts++;
    this.setState(ConnectionState.CONNECTING);
  }

  recordConnectionSuccess(): void {
    this.setState(ConnectionState.CONNECTED);
  }

  recordConnectionFailure(): void {
    this.metrics.failedConnections++;
    this.healthCheck.consecutiveFailures++;
    this.setState(ConnectionState.FAILED);
  }

  shouldReconnect(): boolean {
    return (
      this.state === ConnectionState.DISCONNECTED ||
      this.state === ConnectionState.FAILED
    ) && this.metrics.reconnectionAttempts < this.MAX_RECONNECTION_ATTEMPTS;
  }

  getReconnectionDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.BASE_RECONNECTION_DELAY_MS * Math.pow(2, this.metrics.reconnectionAttempts),
      this.MAX_RECONNECTION_DELAY_MS
    );
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    return exponentialDelay + jitter;
  }

  scheduleReconnection(reconnectFn: () => void): void {
    if (!this.shouldReconnect()) {
      console.warn("[ConnectionManager] Max reconnection attempts reached or invalid state");
      return;
    }

    const delay = this.getReconnectionDelay();
    this.metrics.reconnectionAttempts++;
    this.setState(ConnectionState.RECONNECTING);

    console.log(
      `[ConnectionManager] Scheduling reconnection attempt ${this.metrics.reconnectionAttempts}/${this.MAX_RECONNECTION_ATTEMPTS} in ${Math.round(delay)}ms`
    );

    this.reconnectionTimer = setTimeout(() => {
      console.log(`[ConnectionManager] Executing reconnection attempt ${this.metrics.reconnectionAttempts}`);
      reconnectFn();
    }, delay);
  }

  cancelReconnection(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
      console.log("[ConnectionManager] Reconnection cancelled");
    }
  }

  resetReconnectionAttempts(): void {
    this.metrics.reconnectionAttempts = 0;
    this.cancelReconnection();
  }

  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingInterval = setInterval(() => {
      this.performPing();
    }, this.PING_INTERVAL_MS);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async performPing(): Promise<void> {
    if (this.state !== ConnectionState.CONNECTED) {
      return;
    }

    const startTime = Date.now();
    this.healthCheck.lastPingAt = new Date();

    try {
      // In actual implementation, this would send a ping to the server
      // For now, we'll simulate it
      await new Promise((resolve) => setTimeout(resolve, 10));

      const latencyMs = Date.now() - startTime;
      this.healthCheck.latencyMs = latencyMs;
      this.healthCheck.consecutiveFailures = 0;

      // Update connection quality based on latency
      if (latencyMs < 50) {
        this.healthCheck.connectionQuality = "excellent";
      } else if (latencyMs < 150) {
        this.healthCheck.connectionQuality = "good";
      } else if (latencyMs < 300) {
        this.healthCheck.connectionQuality = "poor";
      } else {
        this.healthCheck.connectionQuality = "critical";
      }
    } catch (error) {
      console.error("[ConnectionManager] Ping failed:", error);
      this.healthCheck.consecutiveFailures++;

      if (this.healthCheck.consecutiveFailures >= 3) {
        console.warn("[ConnectionManager] Connection unhealthy after 3 consecutive ping failures");
        this.healthCheck.isHealthy = false;
        this.healthCheck.connectionQuality = "critical";
      }
    }
  }

  getMetrics(): Readonly<ConnectionMetrics> {
    return { ...this.metrics };
  }

  getHealthCheck(): Readonly<ConnectionHealthCheck> {
    return { ...this.healthCheck };
  }

  getConnectionQualityScore(): number {
    const quality = this.healthCheck.connectionQuality;
    switch (quality) {
      case "excellent":
        return 1.0;
      case "good":
        return 0.8;
      case "poor":
        return 0.5;
      case "critical":
        return 0.2;
      default:
        return 0;
    }
  }

  getSuccessRate(): number {
    const totalAttempts = this.metrics.connectionAttempts;
    if (totalAttempts === 0) return 0;
    return this.metrics.successfulConnections / totalAttempts;
  }

  getAverageUptime(): number {
    const successfulConnections = this.metrics.successfulConnections;
    if (successfulConnections === 0) return 0;
    return this.metrics.totalUptime / successfulConnections;
  }

  isHealthy(): boolean {
    return (
      this.state === ConnectionState.CONNECTED &&
      this.healthCheck.isHealthy &&
      this.healthCheck.consecutiveFailures < 3 &&
      this.healthCheck.connectionQuality !== "critical"
    );
  }

  dispose(): void {
    this.cancelReconnection();
    this.stopPingInterval();
    this.setState(ConnectionState.DISCONNECTED);
    console.log("[ConnectionManager] Disposed");
  }

  reset(): void {
    this.dispose();
    this.metrics = this.initializeMetrics();
    this.healthCheck = this.initializeHealthCheck();
    console.log("[ConnectionManager] Reset");
  }
}

/** Singleton instance for global connection management */
export const globalConnectionManager = new SocketConnectionManager();
