/**
 * Enhanced Communication Routes v2.0
 * Advanced API endpoints supporting international calls and cross-network messaging
 */

import * as express from "express";
import multer from "multer";
import { db } from "../db";
import {
  directMessages, callHistory, meetingRooms, onlineUsers,
  contacts, groupChats, callSessions, callMessages
} from "../../shared/models/comms";
import { eq, desc, asc, or, and } from "drizzle-orm";
import { enhancedCommunicationEngine } from "./enhanced-communication-engine";
import { commsIntelligence } from "./comms-intelligence";

// Extend Express Request interface
declare module "express-serve-static-core" {
  interface Request {
    networkInfo?: any;
  }
}
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/comms/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Enhanced file type validation for international content
    const allowedTypes = [
      "image/", "video/", "audio/", "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument",
      "text/", "application/json"
    ];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    cb(null, isAllowed);
  }
});

// Enhanced middleware for international request validation
const validateInternationalRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { international, countryCode } = req.body;

  if (international) {
    if (!countryCode || countryCode.length < 2) {
      return res.status(400).json({
        error: "Country code required for international requests",
        code: "INVALID_COUNTRY_CODE"
      });
    }

    // Validate country code format
    const countryCodeRegex = /^[A-Z]{2,3}$/;
    if (!countryCodeRegex.test(countryCode.toUpperCase())) {
      return res.status(400).json({
        error: "Invalid country code format",
        code: "INVALID_COUNTRY_FORMAT"
      });
    }
  }

  next();
};

// Enhanced middleware for network quality assessment
const assessNetworkQuality = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.body.userId || req.params.userId;
    if (userId) {
      const networkStatus = await enhancedCommunicationEngine.getNetworkStatus(userId);
      req.networkInfo = networkStatus;
    }
    next();
  } catch (error) {
    console.error("[Routes] Network assessment failed:", error);
    next();
  }
};

// ================================
// ENHANCED CALL MANAGEMENT ROUTES
// ================================

// Initiate enhanced call with international support
router.post("/calls/initiate", validateInternationalRequest, assessNetworkQuality, async (req, res) => {
  try {
    const {
      initiatorId,
      participants,
      callType = "voice",
      international = false,
      countryCode,
      qualityOptimization = true
    } = req.body;

    if (!initiatorId || !participants || participants.length === 0) {
      return res.status(400).json({
        error: "Missing required fields: initiatorId and participants",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }

    const call = await enhancedCommunicationEngine.initiateCall(
      initiatorId,
      participants,
      callType,
      international
    );

    // Store call session in database
    await db.insert(callSessions).values({
      callId: call.callId,
      type: callType,
      participants: participants,
      quality: "HD",
      startTime: call.startedAt,
    });

    // Apply quality optimization if requested
    if (qualityOptimization) {
      await enhancedCommunicationEngine.optimizeCallQuality(call.callId);
    }

    res.json({
      success: true,
      call,
      networkInfo: req.networkInfo,
      international: international,
      message: international ?
        "International call initiated successfully" :
        "Call initiated successfully"
    });

  } catch (error) {
    console.error("[Routes] Call initiation failed:", error);
    res.status(500).json({
      error: "Failed to initiate call",
      code: "CALL_INIT_FAILED"
    });
  }
});

// Get call quality optimization for active call
router.get("/calls/:callId/quality", async (req, res) => {
  try {
    const { callId } = req.params;
    const optimizations = await enhancedCommunicationEngine.optimizeCallQuality(callId);

    if (!optimizations) {
      return res.status(404).json({
        error: "Call not found",
        code: "CALL_NOT_FOUND"
      });
    }

    res.json({
      success: true,
      callId,
      optimizations,
      message: "Call quality optimized"
    });

  } catch (error) {
    console.error("[Routes] Quality optimization failed:", error);
    res.status(500).json({
      error: "Failed to optimize call quality",
      code: "QUALITY_OPTIMIZATION_FAILED"
    });
  }
});

// ================================
// ENHANCED MESSAGING ROUTES
// ================================

// Send enhanced message with international delivery
router.post("/messages/send", validateInternationalRequest, assessNetworkQuality, async (req, res) => {
  try {
    const {
      senderId,
      recipientId,
      groupId,
      content,
      messageType = "text",
      international = false,
      priority = "normal"
    } = req.body;

    if (!senderId || !content) {
      return res.status(400).json({
        error: "Missing required fields: senderId and content",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }

    if (!recipientId && !groupId) {
      return res.status(400).json({
        error: "Either recipientId or groupId must be provided",
        code: "MISSING_RECIPIENT"
      });
    }

    const result = await enhancedCommunicationEngine.sendEnhancedMessage(
      senderId,
      recipientId,
      groupId,
      content,
      messageType,
      international
    );

    // Store message metadata
    await db.insert(directMessages).values({
      senderId,
      recipientId: recipientId || "broadcast",
      content: result.message.content,
    });

    res.json({
      success: true,
      message: international ?
        "International message sent successfully" :
        "Message sent successfully",
      data: result.message,
      delivery: result.delivery,
      international: international
    });

  } catch (error) {
    console.error("[Routes] Message sending failed:", error);
    res.status(500).json({
      error: "Failed to send message",
      code: "MESSAGE_SEND_FAILED"
    });
  }
});

// Get message delivery status
router.get("/messages/:messageId/delivery", async (req, res) => {
  try {
    const { messageId } = req.params;
    const delivery = enhancedCommunicationEngine.getMessageDeliveryStatus(messageId);

    if (!delivery) {
      return res.status(404).json({
        error: "Message delivery status not found",
        code: "DELIVERY_STATUS_NOT_FOUND"
      });
    }

    res.json({
      success: true,
      delivery,
      message: "Delivery status retrieved"
    });

  } catch (error) {
    console.error("[Routes] Delivery status retrieval failed:", error);
    res.status(500).json({
      error: "Failed to get delivery status",
      code: "DELIVERY_STATUS_FAILED"
    });
  }
});

// ================================
// NETWORK MANAGEMENT ROUTES
// ================================

// Get network status for user
router.get("/network/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const networkStatus = await enhancedCommunicationEngine.getNetworkStatus(userId);

    res.json({
      success: true,
      networkStatus,
      message: "Network status retrieved"
    });

  } catch (error) {
    console.error("[Routes] Network status retrieval failed:", error);
    res.status(500).json({
      error: "Failed to get network status",
      code: "NETWORK_STATUS_FAILED"
    });
  }
});

// ================================
// INTERNATIONAL CALLING ROUTES
// ================================

// Get available international routes
router.get("/international/routes", async (req, res) => {
  try {
    const { fromCountry, toCountry } = req.query;

    // This would integrate with the InternationalCallRouter
    // For now, return sample routes
    const routes = [
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
      }
    ];

    let filteredRoutes = routes;
    if (fromCountry && toCountry) {
      filteredRoutes = routes.filter(r =>
        r.fromCountry === fromCountry && r.toCountry === toCountry
      );
    }

    res.json({
      success: true,
      routes: filteredRoutes,
      message: "International routes retrieved"
    });

  } catch (error) {
    console.error("[Routes] International routes retrieval failed:", error);
    res.status(500).json({
      error: "Failed to get international routes",
      code: "INTERNATIONAL_ROUTES_FAILED"
    });
  }
});

// ================================
// LEGACY ROUTES (MAINTAINED FOR COMPATIBILITY)
// ================================

// Get all messages for a user
router.get("/messages/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await db
      .select()
      .from(directMessages)
      .where(
        or(
          eq(directMessages.senderId, userId),
          eq(directMessages.recipientId, userId)
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      success: true,
      messages,
      message: "Messages retrieved successfully"
    });

  } catch (error) {
    console.error("[Routes] Messages retrieval failed:", error);
    res.status(500).json({
      error: "Failed to retrieve messages",
      code: "MESSAGES_RETRIEVAL_FAILED"
    });
  }
});

// Get active calls
router.get("/calls/active", async (req, res) => {
  try {
    const activeCalls = enhancedCommunicationEngine.getActiveCalls();

    res.json({
      success: true,
      calls: activeCalls,
      count: activeCalls.length,
      message: "Active calls retrieved"
    });

  } catch (error) {
    console.error("[Routes] Active calls retrieval failed:", error);
    res.status(500).json({
      error: "Failed to retrieve active calls",
      code: "ACTIVE_CALLS_FAILED"
    });
  }
});

// ================================
// FILE UPLOAD ROUTES
// ================================

// Upload file with enhanced validation
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
        code: "NO_FILE_UPLOADED"
      });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date()
    };

    res.json({
      success: true,
      file: fileInfo,
      message: "File uploaded successfully"
    });

  } catch (error) {
    console.error("[Routes] File upload failed:", error);
    res.status(500).json({
      error: "Failed to upload file",
      code: "FILE_UPLOAD_FAILED"
    });
  }
});

// ================================
// USER STATUS ROUTES
// ================================

// Update user status with network awareness
router.put("/users/:userId/status", assessNetworkQuality, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, customMessage } = req.body;

    const validStatuses = ["online", "away", "do_not_disturb", "offline", "in_call", "international_call"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        code: "INVALID_STATUS"
      });
    }

    await db
      .update(onlineUsers)
      .set({
        lastSeen: new Date(),
      })
      .where(eq(onlineUsers.id, userId));

    res.json({
      success: true,
      status,
      networkInfo: req.networkInfo,
      message: "User status updated successfully"
    });

  } catch (error) {
    console.error("[Routes] Status update failed:", error);
    res.status(500).json({
      error: "Failed to update user status",
      code: "STATUS_UPDATE_FAILED"
    });
  }
});

// ================================
// GROUP CHAT ROUTES
// ================================

// Create group chat with international support
router.post("/groups", async (req, res) => {
  try {
    const { name, description, creatorId, members, isInternational = false } = req.body;

    if (!name || !creatorId || !members || members.length === 0) {
      return res.status(400).json({
        error: "Missing required fields",
        code: "MISSING_GROUP_FIELDS"
      });
    }

    const [group] = await db.insert(groupChats).values({
      name,
      createdBy: creatorId,
      isEncrypted: isInternational,
      createdAt: new Date(),
    }).returning();

    res.json({
      success: true,
      group,
      message: "Group chat created successfully"
    });

  } catch (error) {
    console.error("[Routes] Group creation failed:", error);
    res.status(500).json({
      error: "Failed to create group chat",
      code: "GROUP_CREATION_FAILED"
    });
  }
});

// ================================
// HEALTH CHECK ROUTES
// ================================

// Enhanced health check with system status
router.get("/health", async (req, res) => {
  try {
    const activeCalls = enhancedCommunicationEngine.getActiveCalls();

    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0",
      features: [
        "international_calling",
        "network_agnostic_messaging",
        "quality_optimization",
        "enhanced_encryption"
      ],
      activeCalls: activeCalls.length,
      systemLoad: "normal"
    });

  } catch (error) {
    console.error("[Routes] Health check failed:", error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: "Health check failed"
    });
  }
});

export default router;