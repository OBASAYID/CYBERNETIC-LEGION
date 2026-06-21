/**
 * Cyrus Master Intelligence API Routes
 * Unified endpoint for all AI capabilities
 */

import { Router } from "express";
import { cyrusMasterIntelligence } from "../ai/cyrus-master-intelligence.js";

const router = Router();

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    null
  );
}

// =====================================
// Unified Query Endpoint
// =====================================

router.post("/api/cyrus/query", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { query, mode, context, preferences } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const response = await cyrusMasterIntelligence.query({
      userId,
      query,
      mode,
      context,
      preferences,
    });

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("[Cyrus Master API] Query failed:", error);
    res.status(500).json({
      error: "Query failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// System Status
// =====================================

router.get("/api/cyrus/status", async (req: any, res) => {
  try {
    const status = await cyrusMasterIntelligence.getSystemStatus();

    res.json({
      success: true,
      ...status,
      message: `Cyrus is ${status.status}`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Status check failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Health Check
// =====================================

router.get("/api/cyrus/health", async (req: any, res) => {
  try {
    const healthy = await cyrusMasterIntelligence.healthCheck();

    if (healthy) {
      res.json({
        success: true,
        status: "healthy",
        message: "Cyrus is operational",
      });
    } else {
      res.status(503).json({
        success: false,
        status: "unhealthy",
        message: "Cyrus is experiencing issues",
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Capabilities Info
// =====================================

router.get("/api/cyrus/capabilities", async (req: any, res) => {
  try {
    const status = await cyrusMasterIntelligence.getSystemStatus();

    res.json({
      success: true,
      capabilities: {
        // Core AI
        localIntelligence: status.systems['local-llm'],
        multiModelAI: status.systems['multi-model'],
        
        // Voice
        speechRecognition: status.systems['voice-stt'],
        speechSynthesis: status.systems['voice-tts'],
        voiceConversation: status.systems['voice-stt'] && status.systems['voice-tts'],
        
        // Advanced features
        personalizedLearning: status.systems['learning'],
        selfEvolution: status.systems['evolution'],
        codeGeneration: true,
        documentIntelligence: true,
        
        // Communication
        realTimeMessaging: true,
        videoCallsWebRTC: true,
        groupCalls: true,
        fileSharing: true,
      },
      features: status.capabilities,
      performance: status.performance,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get capabilities",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export { router as cyrusMasterRouter };
