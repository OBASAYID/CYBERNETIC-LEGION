/**
 * Telemetry and monitoring for CYRUS communication system.
 * Provides structured logging, metrics collection, and health checks.
 */

export interface CommsMetrics {
  // Message metrics
  messagesSent: number;
  messagesReceived: number;
  messagesEncrypted: number;
  messagesFailed: number;

  // Call metrics
  callsInitiated: number;
  callsConnected: number;
  callsEnded: number;
  callsFailed: number;
  callsDeclined: number;
  callsMissed: number;

  // Conference metrics
  conferencesCreated: number;
  conferencesActive: number;
  conferencesEnded: number;

  // Presence metrics
  usersOnline: number;
  usersAway: number;
  usersInCall: number;

  // Performance metrics
  avgMessageLatencyMs: number;
  avgCallSetupTimeMs: number;
  p95MessageLatencyMs: number;
  p99MessageLatencyMs: number;

  // Database metrics
  dbQueries: number;
  dbQueryFailures: number;
  dbFallbackMode: boolean;
  dbQueueSize: number;

  // Network metrics
  webrtcConnectionAttempts: number;
  webrtcConnectionSuccesses: number;
  webrtcConnectionFailures: number;
  iceRestartAttempts: number;
  iceRestartSuccesses: number;

  // Error metrics
  validationErrors: number;
  authErrors: number;
  rateLimitHits: number;
  internalErrors: number;
}

export interface TelemetryEvent {
  timestamp: Date;
  type: string;
  userId?: string;
  roomId?: string;
  details: Record<string, unknown>;
  duration?: number;
  success?: boolean;
  error?: string;
}

class CommstelemetryCollector {
  private metrics: CommsMetrics;
  private eventBuffer: TelemetryEvent[] = [];
  private latencyBuffer: number[] = [];
  private callSetupTimes: number[] = [];

  private readonly MAX_BUFFER_SIZE = 1000;
  private readonly MAX_LATENCY_SAMPLES = 500;
  private readonly FLUSH_INTERVAL_MS = 60_000; // Flush every minute

  constructor() {
    this.metrics = this.initializeMetrics();
    this.startPeriodicFlush();
  }

  private initializeMetrics(): CommsMetrics {
    return {
      messagesSent: 0,
      messagesReceived: 0,
      messagesEncrypted: 0,
      messagesFailed: 0,
      callsInitiated: 0,
      callsConnected: 0,
      callsEnded: 0,
      callsFailed: 0,
      callsDeclined: 0,
      callsMissed: 0,
      conferencesCreated: 0,
      conferencesActive: 0,
      conferencesEnded: 0,
      usersOnline: 0,
      usersAway: 0,
      usersInCall: 0,
      avgMessageLatencyMs: 0,
      avgCallSetupTimeMs: 0,
      p95MessageLatencyMs: 0,
      p99MessageLatencyMs: 0,
      dbQueries: 0,
      dbQueryFailures: 0,
      dbFallbackMode: false,
      dbQueueSize: 0,
      webrtcConnectionAttempts: 0,
      webrtcConnectionSuccesses: 0,
      webrtcConnectionFailures: 0,
      iceRestartAttempts: 0,
      iceRestartSuccesses: 0,
      validationErrors: 0,
      authErrors: 0,
      rateLimitHits: 0,
      internalErrors: 0,
    };
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushEvents();
      this.updateDerivedMetrics();
    }, this.FLUSH_INTERVAL_MS);
  }

  recordEvent(event: Omit<TelemetryEvent, "timestamp">): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.eventBuffer.push(fullEvent);

    if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
      this.eventBuffer.shift();
    }

    // Update relevant metrics
    this.updateMetricsFromEvent(fullEvent);
  }

  private updateMetricsFromEvent(event: TelemetryEvent): void {
    switch (event.type) {
      case "message:sent":
        this.metrics.messagesSent++;
        if (event.details.encrypted) this.metrics.messagesEncrypted++;
        break;
      case "message:received":
        this.metrics.messagesReceived++;
        break;
      case "message:failed":
        this.metrics.messagesFailed++;
        break;
      case "call:initiated":
        this.metrics.callsInitiated++;
        break;
      case "call:connected":
        this.metrics.callsConnected++;
        if (event.duration) {
          this.callSetupTimes.push(event.duration);
          if (this.callSetupTimes.length > this.MAX_LATENCY_SAMPLES) {
            this.callSetupTimes.shift();
          }
        }
        break;
      case "call:ended":
        this.metrics.callsEnded++;
        break;
      case "call:failed":
        this.metrics.callsFailed++;
        break;
      case "call:declined":
        this.metrics.callsDeclined++;
        break;
      case "call:missed":
        this.metrics.callsMissed++;
        break;
      case "conference:created":
        this.metrics.conferencesCreated++;
        this.metrics.conferencesActive++;
        break;
      case "conference:ended":
        this.metrics.conferencesEnded++;
        this.metrics.conferencesActive = Math.max(0, this.metrics.conferencesActive - 1);
        break;
      case "webrtc:connection:attempt":
        this.metrics.webrtcConnectionAttempts++;
        break;
      case "webrtc:connection:success":
        this.metrics.webrtcConnectionSuccesses++;
        break;
      case "webrtc:connection:failure":
        this.metrics.webrtcConnectionFailures++;
        break;
      case "ice:restart:attempt":
        this.metrics.iceRestartAttempts++;
        break;
      case "ice:restart:success":
        this.metrics.iceRestartSuccesses++;
        break;
      case "db:query":
        this.metrics.dbQueries++;
        break;
      case "db:query:failure":
        this.metrics.dbQueryFailures++;
        break;
      case "error:validation":
        this.metrics.validationErrors++;
        break;
      case "error:auth":
        this.metrics.authErrors++;
        break;
      case "error:rate_limit":
        this.metrics.rateLimitHits++;
        break;
      case "error:internal":
        this.metrics.internalErrors++;
        break;
    }

    // Record latency
    if (event.duration) {
      this.latencyBuffer.push(event.duration);
      if (this.latencyBuffer.length > this.MAX_LATENCY_SAMPLES) {
        this.latencyBuffer.shift();
      }
    }
  }

  private updateDerivedMetrics(): void {
    if (this.latencyBuffer.length > 0) {
      const sorted = [...this.latencyBuffer].sort((a, b) => a - b);
      this.metrics.avgMessageLatencyMs = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      this.metrics.p95MessageLatencyMs = sorted[Math.floor(sorted.length * 0.95)] || 0;
      this.metrics.p99MessageLatencyMs = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }

    if (this.callSetupTimes.length > 0) {
      this.metrics.avgCallSetupTimeMs = this.callSetupTimes.reduce((a, b) => a + b, 0) / this.callSetupTimes.length;
    }
  }

  recordMessageLatency(latencyMs: number): void {
    this.latencyBuffer.push(latencyMs);
    if (this.latencyBuffer.length > this.MAX_LATENCY_SAMPLES) {
      this.latencyBuffer.shift();
    }
  }

  updatePresenceMetrics(online: number, away: number, inCall: number): void {
    this.metrics.usersOnline = online;
    this.metrics.usersAway = away;
    this.metrics.usersInCall = inCall;
  }

  updateDbMetrics(fallbackMode: boolean, queueSize: number): void {
    this.metrics.dbFallbackMode = fallbackMode;
    this.metrics.dbQueueSize = queueSize;
  }

  getMetrics(): Readonly<CommsMetrics> {
    return { ...this.metrics };
  }

  getRecentEvents(limit = 100): TelemetryEvent[] {
    return this.eventBuffer.slice(-limit);
  }

  private flushEvents(): void {
    if (this.eventBuffer.length === 0) return;

    // In production, this would send to monitoring service (Datadog, CloudWatch, etc.)
    console.log(`[Telemetry] Flushing ${this.eventBuffer.length} events`);

    // Keep last 100 events for debugging
    if (this.eventBuffer.length > 100) {
      this.eventBuffer = this.eventBuffer.slice(-100);
    }
  }

  reset(): void {
    this.metrics = this.initializeMetrics();
    this.eventBuffer = [];
    this.latencyBuffer = [];
    this.callSetupTimes = [];
  }

  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rates
    const totalCalls = this.metrics.callsInitiated;
    if (totalCalls > 0) {
      const failureRate = this.metrics.callsFailed / totalCalls;
      if (failureRate > 0.1) {
        issues.push(`High call failure rate: ${(failureRate * 100).toFixed(1)}%`);
        recommendations.push("Check network connectivity and TURN server configuration");
      }
    }

    // Check message failures
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesFailed;
    if (totalMessages > 0) {
      const messageFailureRate = this.metrics.messagesFailed / totalMessages;
      if (messageFailureRate > 0.05) {
        issues.push(`High message failure rate: ${(messageFailureRate * 100).toFixed(1)}%`);
        recommendations.push("Check database connectivity and queue health");
      }
    }

    // Check WebRTC connection success rate
    const totalWebRtcAttempts = this.metrics.webrtcConnectionAttempts;
    if (totalWebRtcAttempts > 0) {
      const webrtcSuccessRate = this.metrics.webrtcConnectionSuccesses / totalWebRtcAttempts;
      if (webrtcSuccessRate < 0.8) {
        issues.push(`Low WebRTC success rate: ${(webrtcSuccessRate * 100).toFixed(1)}%`);
        recommendations.push("Review ICE server configuration and network policies");
      }
    }

    // Check latency
    if (this.metrics.p95MessageLatencyMs > 1000) {
      issues.push(`High message latency (P95): ${this.metrics.p95MessageLatencyMs}ms`);
      recommendations.push("Check database performance and network latency");
    }

    // Check database
    if (this.metrics.dbFallbackMode) {
      issues.push("Database in fallback mode");
      recommendations.push("Restore database connectivity");
    }

    if (this.metrics.dbQueueSize > 100) {
      issues.push(`Large database queue: ${this.metrics.dbQueueSize} operations pending`);
      recommendations.push("Increase database capacity or check for connection issues");
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

export const commsTelemetry = new CommstelemetryCollector();

/** Structured logging helper */
export function logCommsEvent(
  level: "info" | "warn" | "error",
  event: string,
  details?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const message = `[Comms][${level.toUpperCase()}] ${event}`;

  if (details && Object.keys(details).length > 0) {
    console[level](message, details);
  } else {
    console[level](message);
  }

  // Record to telemetry if it's an error or warning
  if (level === "error" || level === "warn") {
    commsTelemetry.recordEvent({
      type: `log:${level}`,
      details: { event, ...details },
    });
  }
}
