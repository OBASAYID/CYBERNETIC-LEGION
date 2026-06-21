/**
 * Learning System API Routes
 */

import { Router } from "express";
import { enhancedLearningSystem } from "../ai/enhanced-learning-system.js";

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
// Get User Profile
// =====================================

router.get("/api/learning/profile", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const profile = await enhancedLearningSystem.getUserProfile(userId);

    res.json({
      success: true,
      profile: {
        userId: profile.userId,
        preferences: profile.preferences,
        totalInteractions: profile.interactionHistory.totalInteractions,
        lastInteraction: profile.lastInteraction,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get profile",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Update Preferences
// =====================================

router.post("/api/learning/preferences", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await enhancedLearningSystem.updatePreferences(userId, req.body);

    res.json({
      success: true,
      message: "Preferences updated",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update preferences",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Submit Feedback
// =====================================

router.post("/api/learning/feedback", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { feedback, context } = req.body;

    if (!feedback || !['positive', 'negative', 'neutral'].includes(feedback)) {
      return res.status(400).json({ error: "Valid feedback required" });
    }

    await enhancedLearningSystem.recordFeedback(userId, feedback, context || '');

    res.json({
      success: true,
      message: "Feedback recorded",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to record feedback",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Get Learning Stats
// =====================================

router.get("/api/learning/stats", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const stats = enhancedLearningSystem.getUserStats(userId);

    if (!stats) {
      return res.status(404).json({ error: "No statistics available" });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get statistics",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Generate Learning Report
// =====================================

router.get("/api/learning/report", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const report = await enhancedLearningSystem.generateLearningReport(userId);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate report",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Personalized Chat
// =====================================

router.post("/api/learning/chat", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const response = await enhancedLearningSystem.generatePersonalizedResponse(
      userId,
      query,
      context
    );

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("[Learning API] Chat failed:", error);
    res.status(500).json({
      error: "Chat failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Update Learning Progress
// =====================================

router.post("/api/learning/progress", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { topic, progress } = req.body;

    if (!topic || typeof progress !== 'number') {
      return res.status(400).json({ error: "Topic and progress required" });
    }

    await enhancedLearningSystem.updateLearningProgress(userId, topic, progress);

    res.json({
      success: true,
      message: "Progress updated",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update progress",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export { router as learningRouter };
