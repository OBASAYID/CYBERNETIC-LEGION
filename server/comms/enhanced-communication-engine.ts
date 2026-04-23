/**
 * Enhanced Communication Engine v2.0
 * Advanced communication system supporting clear calls and messages
 * across different networks with international calling capabilities
 */

import { db } from "../db.js";
import {
  directMessages, callHistory, meetingRooms, onlineUsers,
  contacts, groupChats, callSessions, callMessages
} from "../../shared/models/comms";
import { eq, desc, asc, or, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import * as crypto from "crypto";
import { spawn } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = process.cwd() + "/server/comms/enhanced-communication-engine.ts";
const __dirname = process.cwd() + "/server/comms";

type CallType = "voice" | "video" | "conference" | "screen_share" | "international_voice" | "international_video";
type CallStatus = "initiating" | "ringing" | "connected" | "on_hold" | "ended" | "declined" | "missed" | "failed" | "connecting_international";
type UserStatus = "online" | "away" | "do_not_disturb" | "offline" | "in_call" | "international_call";
type MessageType = "text" | "image" | "video" | "file" | "voice_note" | "system" | "international_sms";
type NetworkType = "wifi" | "cellular" | "satellite" | "vpn" | "mesh" | "unknown";

interface NetworkInfo {
  type: NetworkType;
  quality: number; // 0-100
  latency: number; // ms
  bandwidth: number; // kbps
  country: string;
  carrier?: string;
  roaming: boolean;
  international: boolean;
}

interface EnhancedCall {
  callId: string;
  callType: CallType;
  initiatorId: string;
  initiatorName: string;
  participants: string[];
  status: CallStatus;
  startedAt: Date | null;
  callQuality: number;
  bandwidthKbps: number;
  isRecording: boolean;
  networkInfo: NetworkInfo;
  internationalRoute?: string;
  qualityOptimization: boolean;
  fallbackEnabled: boolean;
}

interface InternationalRoute {
  routeId: string;
  fromCountry: string;
  toCountry: string;
  carrier: string;
  quality: number;
  cost: number;
  latency: number;
  active: boolean;
}

interface MessageDelivery {
  messageId: string;
  recipientId: string;
  networkType: NetworkType;
  deliveryMethod: "direct" | "sms" | "international_sms" | "satellite" | "mesh";
  status: "sent" | "delivered" | "failed" | "retrying";
  retryCount: number;
  international: boolean;
  estimatedDelivery: Date;
}

class NetworkQualityManager {
  private networkCache: Map<string, NetworkInfo> = new Map();
  private qualityHistory: Map<string, number[]> = new Map();

  async assessNetworkQuality(userId: string): Promise<NetworkInfo> {
    // Get cached network info or detect new
    if (this.networkCache.has(userId)) {
      return this.networkCache.get(userId)!;
    }

    // Detect network type and quality
    const networkInfo = await this.detectNetwork(userId);
    this.networkCache.set(userId, networkInfo);

    // Update quality history
    if (!this.qualityHistory.has(userId)) {
      this.qualityHistory.set(userId, []);
    }
    const history = this.qualityHistory.get(userId)!;
    history.push(networkInfo.quality);
    if (history.length > 10) history.shift(); // Keep last 10 readings

    return networkInfo;
  }

  private async detectNetwork(userId: string): Promise<NetworkInfo> {
    // In a real implementation, this would use WebRTC stats, device APIs, etc.
    // For now, return simulated network info
    return {
      type: "wifi",
      quality: 85,
      latency: 25,
      bandwidth: 50000,
      country: "US",
      carrier: "Local ISP",
      roaming: false,
      international: false
    };
  }

  optimizeForNetwork(networkInfo: NetworkInfo): any {
    const optimizations = {
      videoCodec: networkInfo.bandwidth > 1000 ? "H264" : "VP8",
      videoQuality: networkInfo.bandwidth > 2000 ? "1080p" : networkInfo.bandwidth > 500 ? "720p" : "480p",
      audioCodec: "OPUS",
      audioBitrate: networkInfo.bandwidth > 100 ? 128 : 64,
      enableFEC: networkInfo.quality < 80,
      enablePLC: networkInfo.latency > 100,
      jitterBuffer: networkInfo.latency > 50 ? 100 : 50
    };

    return optimizations;
  }
}

class InternationalCallRouter {
  private routes: Map<string, InternationalRoute[]> = new Map();
  private activeRoutes: InternationalRoute[] = [];

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Initialize international calling routes
    // In production, this would connect to telecom APIs
    const sampleRoutes: InternationalRoute[] = [
      {
        routeId: "us-to-uk-voip",
        fromCountry: "US",
        toCountry: "UK",
        carrier: "GlobalVoIP",
        quality: 95,
        cost: 0.02,
        latency: 45,
        active: true
      },
      {
        routeId: "us-to-india-satellite",
        fromCountry: "US",
        toCountry: "IN",
        carrier: "SatelliteCom",
        quality: 85,
        cost: 0.15,
        latency: 120,
        active: true
      },
      // Add more routes as needed
    ];

    this.activeRoutes = sampleRoutes;

    // Group routes by country pair
    for (const route of sampleRoutes) {
      const key = `${route.fromCountry}-${route.toCountry}`;
      if (!this.routes.has(key)) {
        this.routes.set(key, []);
      }
      this.routes.get(key)!.push(route);
    }
  }

  findBestRoute(fromCountry: string, toCountry: string): InternationalRoute | null {
    const key = `${fromCountry}-${toCountry}`;
    const availableRoutes = this.routes.get(key) || [];

    if (availableRoutes.length === 0) {
      return null;
    }

    // Find route with best quality-to-cost ratio
    return availableRoutes.reduce((best, current) => {
      const bestScore = best.quality / best.cost;
      const currentScore = current.quality / current.cost;
      return currentScore > bestScore ? current : best;
    });
  }

  async establishInternationalCall(callId: string, route: InternationalRoute): Promise<boolean> {
    // In production, this would establish connection through telecom APIs
    console.log(`[International Router] Establishing call ${callId} via ${route.carrier}`);
    return true;
  }
}

class MessageDeliveryManager {
  private deliveryQueue: MessageDelivery[] = [];
  private retryAttempts: Map<string, number> = new Map();

  getDeliveryQueue(): MessageDelivery[] {
    return this.deliveryQueue;
  }

  async sendMessage(message: any, networkInfo: NetworkInfo): Promise<MessageDelivery> {
    const delivery: MessageDelivery = {
      messageId: message.id,
      recipientId: message.recipientId,
      networkType: networkInfo.type,
      deliveryMethod: this.selectDeliveryMethod(networkInfo),
      status: "sent",
      retryCount: 0,
      international: networkInfo.international,
      estimatedDelivery: new Date(Date.now() + this.calculateDeliveryTime(networkInfo))
    };

    // Attempt delivery
    const success = await this.attemptDelivery(delivery);

    if (!success && delivery.retryCount < 3) {
      delivery.status = "retrying";
      this.scheduleRetry(delivery);
    } else if (!success) {
      delivery.status = "failed";
    } else {
      delivery.status = "delivered";
    }

    this.deliveryQueue.push(delivery);
    return delivery;
  }

  private selectDeliveryMethod(networkInfo: NetworkInfo): MessageDelivery["deliveryMethod"] {
    if (networkInfo.international) {
      return networkInfo.type === "satellite" ? "satellite" : "international_sms";
    }

    switch (networkInfo.type) {
      case "wifi":
      case "cellular":
        return "direct";
      case "satellite":
        return "satellite";
      case "mesh":
        return "mesh";
      default:
        return "sms";
    }
  }

  private calculateDeliveryTime(networkInfo: NetworkInfo): number {
    // Base delivery time in milliseconds
    let baseTime = 1000; // 1 second

    // Adjust for network conditions
    if (networkInfo.type === "satellite") baseTime += 5000; // +5 seconds
    if (networkInfo.international) baseTime += 3000; // +3 seconds
    if (networkInfo.latency > 100) baseTime += networkInfo.latency;
    if (networkInfo.quality < 50) baseTime += 2000; // +2 seconds for poor quality

    return baseTime;
  }

  private async attemptDelivery(delivery: MessageDelivery): Promise<boolean> {
    try {
      // Simulate delivery attempt
      // In production, this would use appropriate APIs based on delivery method
      await new Promise(resolve => setTimeout(resolve, 500));
      return Math.random() > 0.1; // 90% success rate
    } catch (error) {
      console.error(`[Message Delivery] Failed to deliver message ${delivery.messageId}:`, error);
      return false;
    }
  }

  private scheduleRetry(delivery: MessageDelivery) {
    delivery.retryCount++;
    setTimeout(async () => {
      const success = await this.attemptDelivery(delivery);
      if (success) {
        delivery.status = "delivered";
      } else if (delivery.retryCount >= 3) {
        delivery.status = "failed";
      } else {
        this.scheduleRetry(delivery);
      }
    }, 2000 * delivery.retryCount); // Exponential backoff
  }
}

class EnhancedEncryptionEngine {
  private keys: Map<string, Buffer> = new Map();
  private internationalKeys: Map<string, { key: Buffer, algorithm: string }> = new Map();

  generateKey(userId: string, international: boolean = false): string {
    const key = crypto.randomBytes(international ? 32 : 32); // AES-256
    const algorithm = international ? "aes-256-gcm" : "aes-256-cbc";

    if (international) {
      this.internationalKeys.set(userId, { key, algorithm });
    } else {
      this.keys.set(userId, key);
    }

    return key.toString("hex");
  }

  encrypt(userId: string, message: string, international: boolean = false): string {
    const keyData = international ?
      this.internationalKeys.get(userId) :
      { key: this.keys.get(userId), algorithm: "aes-256-cbc" };

    if (!keyData?.key) return message;

    try {
      if (international && keyData.algorithm === "aes-256-gcm") {
        // Use GCM for international calls (better security)
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(keyData.algorithm, keyData.key, iv);
        let encrypted = cipher.update(message, "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag();
        return iv.toString("hex") + ":" + encrypted + ":" + authTag.toString("hex");
      } else {
        // Standard CBC encryption
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(keyData.algorithm, keyData.key, iv);
        let encrypted = cipher.update(message, "utf8", "hex");
        encrypted += cipher.final("hex");
        return iv.toString("hex") + ":" + encrypted;
      }
    } catch (error) {
      console.error("[Encryption] Encryption failed:", error);
      return message;
    }
  }

  decrypt(userId: string, encrypted: string, international: boolean = false): string {
    const keyData = international ?
      this.internationalKeys.get(userId) :
      { key: this.keys.get(userId), algorithm: "aes-256-cbc" };

    if (!keyData?.key) return encrypted;

    try {
      if (international && keyData.algorithm === "aes-256-gcm") {
        // GCM decryption
        const [ivHex, data, authTagHex] = encrypted.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");
        const decipher = crypto.createDecipheriv(keyData.algorithm, keyData.key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(data, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      } else {
        // CBC decryption
        const [ivHex, data] = encrypted.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const decipher = crypto.createDecipheriv(keyData.algorithm, keyData.key, iv);
        let decrypted = decipher.update(data, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      }
    } catch (error) {
      console.error("[Encryption] Decryption failed:", error);
      return encrypted;
    }
  }

  hasKey(userId: string, international: boolean = false): boolean {
    return international ?
      this.internationalKeys.has(userId) :
      this.keys.has(userId);
  }
}

export class EnhancedCommunicationEngine {
  private activeCalls: Map<string, EnhancedCall> = new Map();
  private userPresence: Map<string, any> = new Map();
  private networkManager: NetworkQualityManager;
  private internationalRouter: InternationalCallRouter;
  private messageDelivery: MessageDeliveryManager;
  private encryption: EnhancedEncryptionEngine;
  private messageCount: number = 0;

  constructor() {
    this.networkManager = new NetworkQualityManager();
    this.internationalRouter = new InternationalCallRouter();
    this.messageDelivery = new MessageDeliveryManager();
    this.encryption = new EnhancedEncryptionEngine();

    console.log("[Enhanced Communication Engine] Advanced Communication Engine v2.0 initialized");
    console.log("[Enhanced Communication Engine] International calling and network-agnostic messaging enabled");
  }

  async initiateCall(
    initiatorId: string,
    participants: string[],
    callType: CallType = "voice",
    international: boolean = false
  ): Promise<EnhancedCall> {
    const callId = uuid();
    const networkInfo = await this.networkManager.assessNetworkQuality(initiatorId);

    // Determine if this is an international call
    const isInternational = international || await this.isInternationalCall(participants);

    const call: EnhancedCall = {
      callId,
      callType,
      initiatorId,
      initiatorName: await this.getUserName(initiatorId),
      participants,
      status: isInternational ? "connecting_international" : "initiating",
      startedAt: null,
      callQuality: 100,
      bandwidthKbps: networkInfo.bandwidth,
      isRecording: false,
      networkInfo,
      qualityOptimization: true,
      fallbackEnabled: true
    };

    if (isInternational) {
      // Find international route
      const route = this.internationalRouter.findBestRoute(
        networkInfo.country,
        await this.getParticipantCountry(participants[0])
      );

      if (route) {
        call.internationalRoute = route.routeId;
        await this.internationalRouter.establishInternationalCall(callId, route);
      }
    }

    this.activeCalls.set(callId, call);

    console.log(`[Enhanced Comms] ${isInternational ? 'International ' : ''}Call initiated: ${callId} (${callType})`);
    return call;
  }

  async sendEnhancedMessage(
    senderId: string,
    recipientId: string | null,
    groupId: string | null,
    content: string,
    messageType: MessageType = "text",
    international: boolean = false
  ) {
    const networkInfo = await this.networkManager.assessNetworkQuality(senderId);
    const isInternational = international || networkInfo.international;

    // Generate encryption key if needed
    if (!this.encryption.hasKey(senderId, isInternational)) {
      this.encryption.generateKey(senderId, isInternational);
    }

    const encryptedContent = this.encryption.encrypt(senderId, content, isInternational);

    const [message] = await db.insert(directMessages).values({
      senderId,
      recipientId: recipientId || "broadcast",
      content: encryptedContent,
    }).returning();

    // Handle delivery
    const delivery = await this.messageDelivery.sendMessage(message, networkInfo);

    this.messageCount++;

    console.log(`[Enhanced Comms] Message sent from ${senderId} to ${recipientId || groupId || "broadcast"} (${messageType}) - ${isInternational ? 'International' : 'Local'} - Delivery: ${delivery.status}`);

    return { message, delivery };
  }

  async optimizeCallQuality(callId: string): Promise<any> {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    const optimizations = this.networkManager.optimizeForNetwork(call.networkInfo);

    // Apply optimizations to active call
    call.qualityOptimization = true;

    console.log(`[Enhanced Comms] Optimized call ${callId} for ${call.networkInfo.type} network`);
    return optimizations;
  }

  private async isInternationalCall(participants: string[]): Promise<boolean> {
    const initiatorCountry = "US"; // Would get from user profile
    for (const participant of participants) {
      const participantCountry = await this.getParticipantCountry(participant);
      if (participantCountry !== initiatorCountry) {
        return true;
      }
    }
    return false;
  }

  private async getParticipantCountry(userId: string): Promise<string> {
    // In production, this would query user profile/location data
    // For now, simulate based on user ID
    if (userId.includes("uk")) return "UK";
    if (userId.includes("in")) return "IN";
    if (userId.includes("de")) return "DE";
    return "US";
  }

  private async getUserName(userId: string): Promise<string> {
    // Would query user database
    return `User-${userId.substring(0, 8)}`;
  }

  getActiveCalls(): EnhancedCall[] {
    return Array.from(this.activeCalls.values());
  }

  getNetworkStatus(userId: string): Promise<any> {
    return this.networkManager.assessNetworkQuality(userId);
  }

  getMessageDeliveryStatus(messageId: string): MessageDelivery | null {
    return this.messageDelivery.getDeliveryQueue().find(d => d.messageId === messageId) || null;
  }

  async shutdown(): Promise<void> {
    console.log("[Enhanced Communication Engine] Shutting down...");

    // End all active calls
    this.activeCalls.forEach((call) => {
      call.status = "ended";
    });
    this.activeCalls.clear();

    console.log("[Enhanced Communication Engine] Shutdown complete");
  }
}

export const enhancedCommunicationEngine = new EnhancedCommunicationEngine();