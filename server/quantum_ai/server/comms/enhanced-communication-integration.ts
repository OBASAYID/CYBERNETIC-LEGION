/**
 * Enhanced Communication Integration v2.0
 * Integration layer for advanced communication system with international support
 */

import express from "express";
import { Server as HTTPServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import enhanced components
import { enhancedCommunicationEngine } from "./enhanced-communication-engine";
import { enhancedSignalingServer } from "./enhanced-signaling";
import { EnhancedSocketSignalingServer } from "./enhanced-socket-signaling";

class EnhancedCommunicationIntegration {
  private app: express.Application;
  private server: HTTPServer;
  private mlServiceProcess: any = null;
  private signalingServer: any = null;
  private socketSignalingServer: any = null;

  constructor() {
    this.app = express();
    this.server = new HTTPServer(this.app);

    this.initializeMiddleware();
    this.initializeRoutes();
    this.startServices();

    console.log("[Enhanced Communication Integration] v2.0 initialized");
    console.log("[Enhanced Communication Integration] International calling and cross-network messaging enabled");
  }

  private initializeMiddleware() {
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // CORS middleware for international access
    this.app.use((req, res, next) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://cyrus-ai.com",
        "https://app.cyrus-ai.com"
      ];

      const origin = req.headers.origin;
      if (allowedOrigins.includes(origin as string) || !origin) {
        res.header("Access-Control-Allow-Origin", origin || "*");
      }

      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Network-Type, X-Network-Quality");
      res.header("Access-Control-Allow-Credentials", "true");

      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Network quality middleware
    this.app.use("/api/comms", (req, res, next) => {
      const networkType = req.headers["x-network-type"] as string;
      const networkQuality = parseInt(req.headers["x-network-quality"] as string) || 85;
      const country = req.headers["x-country"] as string || "US";
      const international = req.headers["x-international"] === "true";

      req.networkInfo = {
        type: networkType || "wifi",
        quality: networkQuality,
        country,
        international
      };

      next();
    });
  }

  private initializeRoutes() {
    // Import enhanced routes
    import("./enhanced-comms-routes").then(({ default: enhancedRoutes }) => {
      this.app.use("/api/comms", enhancedRoutes);
      console.log("[Integration] Enhanced communication routes loaded");
    }).catch(error => {
      console.error("[Integration] Failed to load enhanced routes:", error);
    });

    // Legacy route compatibility
    this.app.use("/api/comms", (req, res, next) => {
      // Fallback for legacy endpoints
      if (!res.headersSent) {
        next();
      }
    });

    // Health check endpoint
    this.app.get("/health", async (req, res) => {
      try {
        const health = {
          status: "healthy",
          version: "2.0",
          timestamp: new Date().toISOString(),
          services: {
            communication_engine: "active",
            signaling: this.signalingServer ? "active" : "inactive",
            socket_signaling: this.socketSignalingServer ? "active" : "inactive",
            ml_service: this.mlServiceProcess ? "active" : "inactive"
          },
          features: [
            "international_calling",
            "cross_network_messaging",
            "quality_optimization",
            "enhanced_encryption",
            "real_time_signaling",
            "ml_intelligence"
          ],
          stats: {
            connected_users: this.socketSignalingServer?.getUserCount() || 0,
            active_rooms: this.socketSignalingServer?.getRoomCount() || 0,
            active_calls: this.socketSignalingServer?.getActiveCallsCount() || 0
          }
        };

        res.json(health);
      } catch (error) {
        console.error("[Integration] Health check error:", error);
        res.status(500).json({
          status: "unhealthy",
          error: error.message
        });
      }
    });

    // International calling status
    this.app.get("/international/status", (req, res) => {
      res.json({
        international_calling: true,
        supported_countries: ["US", "UK", "IN", "DE", "FR", "CA", "AU", "JP"],
        features: {
          voice_calls: true,
          video_calls: true,
          messaging: true,
          quality_optimization: true,
          network_adaptation: true
        },
        version: "2.0"
      });
    });

    // Network optimization endpoint
    this.app.post("/optimize/network", async (req, res) => {
      try {
        const { userId, networkInfo, callType } = req.body;

        if (!userId || !networkInfo) {
          return res.status(400).json({
            error: "userId and networkInfo required"
          });
        }

        // Get optimization recommendations from ML service
        const optimizations = await this.getNetworkOptimizations(userId, networkInfo, callType);

        res.json({
          success: true,
          optimizations,
          message: "Network optimization recommendations generated"
        });

      } catch (error) {
        console.error("[Integration] Network optimization error:", error);
        res.status(500).json({
          error: "Failed to optimize network",
          details: error.message
        });
      }
    });
  }

  private async startServices() {
    try {
      // Start ML Service
      await this.startMLService();

      // Initialize Signaling Servers
      this.initializeSignalingServers();

      console.log("[Integration] All enhanced communication services started successfully");

    } catch (error) {
      console.error("[Integration] Failed to start services:", error);
      throw error;
    }
  }

  private async startMLService(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mlServicePath = path.join(__dirname, "enhanced-ml-service.py");

      console.log("[Integration] Starting Enhanced ML Service...");

      this.mlServiceProcess = spawn("python3", [mlServicePath], {
        cwd: __dirname,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONPATH: __dirname }
      });

      let startupTimeout = setTimeout(() => {
        reject(new Error("ML Service startup timeout"));
      }, 30000);

      this.mlServiceProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("[ML Service]", output.trim());

        if (output.includes("Enhanced ML Service v2.0 initialized")) {
          clearTimeout(startupTimeout);
          console.log("[Integration] ML Service started successfully");
          resolve();
        }
      });

      this.mlServiceProcess.stderr.on("data", (data) => {
        console.error("[ML Service Error]", data.toString().trim());
      });

      this.mlServiceProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`[Integration] ML Service exited with code ${code}`);
          reject(new Error(`ML Service failed with code ${code}`));
        }
      });

      this.mlServiceProcess.on("error", (error) => {
        console.error("[Integration] Failed to start ML Service:", error);
        reject(error);
      });
    });
  }

  private initializeSignalingServers() {
    // WebSocket Signaling Server
    this.signalingServer = enhancedSignalingServer;

    // Socket.IO Signaling Server
    this.socketSignalingServer = new EnhancedSocketSignalingServer(this.server, [
      "http://localhost:3000",
      "http://localhost:3001"
    ]);

    console.log("[Integration] Signaling servers initialized");
  }

  private async getNetworkOptimizations(userId: string, networkInfo: any, callType: string = "voice") {
    try {
      // Call ML service for optimization recommendations
      const optimizations = await enhancedCommunicationEngine.optimizeCallQuality("temp_call_id");

      return {
        ...optimizations,
        network_adaptations: {
          codec_selection: networkInfo.quality > 80 ? "high_quality" : "standard",
          bandwidth_optimization: networkInfo.bandwidth < 1000,
          latency_compensation: networkInfo.latency > 50
        },
        international_optimizations: networkInfo.international ? {
          route_optimization: true,
          quality_enhancement: true,
          compression_enabled: true
        } : null
      };

    } catch (error) {
      console.error("[Integration] Network optimization fetch error:", error);
      return {
        error: "Failed to get optimizations",
        fallback: {
          video_quality: "720p",
          audio_codec: "OPUS",
          adaptive_bitrate: true
        }
      };
    }
  }

  // Public API methods
  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): HTTPServer {
    return this.server;
  }

  public getCommunicationEngine() {
    return enhancedCommunicationEngine;
  }

  public getSignalingServer() {
    return this.signalingServer;
  }

  public getSocketSignalingServer() {
    return this.socketSignalingServer;
  }

  public async shutdown(): Promise<void> {
    console.log("[Enhanced Communication Integration] Shutting down...");

    // Shutdown signaling servers
    if (this.signalingServer && typeof this.signalingServer.shutdown === 'function') {
      this.signalingServer.shutdown();
    }

    if (this.socketSignalingServer && typeof this.socketSignalingServer.shutdown === 'function') {
      this.socketSignalingServer.shutdown();
    }

    // Shutdown communication engine
    await enhancedCommunicationEngine.shutdown();

    // Kill ML service
    if (this.mlServiceProcess) {
      this.mlServiceProcess.kill();
      console.log("[Integration] ML Service terminated");
    }

    // Close HTTP server
    this.server.close(() => {
      console.log("[Enhanced Communication Integration] HTTP server closed");
    });

    console.log("[Enhanced Communication Integration] Shutdown complete");
  }

  // International calling utilities
  public async initiateInternationalCall(callerId: string, recipientId: string, countryCode: string) {
    return await enhancedCommunicationEngine.initiateCall(callerId, [recipientId], "international_voice", true);
  }

  public async sendInternationalMessage(senderId: string, recipientId: string, content: string, countryCode: string) {
    return await enhancedCommunicationEngine.sendEnhancedMessage(
      senderId,
      recipientId,
      null,
      content,
      "international_sms",
      true
    );
  }

  // Network quality monitoring
  public async getNetworkStatus(userId: string) {
    return await enhancedCommunicationEngine.getNetworkStatus(userId);
  }

  // Message delivery tracking
  public getMessageDeliveryStatus(messageId: string) {
    return enhancedCommunicationEngine.getMessageDeliveryStatus(messageId);
  }
}

// Export singleton instance
export const enhancedCommunicationIntegration = new EnhancedCommunicationIntegration();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[Enhanced Communication Integration] Received SIGINT, shutting down gracefully...");
  await enhancedCommunicationIntegration.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[Enhanced Communication Integration] Received SIGTERM, shutting down gracefully...");
  await enhancedCommunicationIntegration.shutdown();
  process.exit(0);
});

export default enhancedCommunicationIntegration;