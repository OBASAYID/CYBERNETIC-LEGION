/**
 * Voice Interaction API Routes
 * 
 * Enables Cyrus to listen and talk through HTTP endpoints
 */

import { Router } from "express";
import multer from "multer";
import { advancedVoiceSystem } from "../ai/advanced-voice-system.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for audio
});

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    null
  );
}

// =====================================
// Speech-to-Text
// =====================================

router.post("/api/voice/speech-to-text", upload.single("audio"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const options = {
      language: req.body.language,
      model: req.body.model,
      prompt: req.body.prompt,
    };

    const result = await advancedVoiceSystem.speechToText(req.file.buffer, options);

    res.json({
      success: true,
      text: result.text,
      language: result.language,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error("[Voice API] Speech-to-text failed:", error);
    res.status(500).json({
      error: "Speech recognition failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Text-to-Speech
// =====================================

router.post("/api/voice/text-to-speech", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { text, voice, model, speed, emotion } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    const result = await advancedVoiceSystem.textToSpeech(text, {
      voice,
      model,
      speed,
      emotion,
    });

    if (result.audioBuffer) {
      // Return audio file
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer.length,
        'Content-Disposition': 'attachment; filename="cyrus-speech.mp3"',
      });
      res.send(result.audioBuffer);
    } else {
      res.json({
        success: true,
        text: result.text,
        duration: result.duration,
        message: "Audio generation unavailable - configure TTS API keys",
      });
    }
  } catch (error) {
    console.error("[Voice API] Text-to-speech failed:", error);
    res.status(500).json({
      error: "Speech generation failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Conversational Voice Interaction
// =====================================

router.post("/api/voice/conversation", upload.single("audio"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const context = req.body.context;

    const result = await advancedVoiceSystem.conversationalLoop(
      req.file.buffer,
      context
    );

    if (result.audioBuffer) {
      // Return JSON with text and audio data URL
      res.json({
        success: true,
        text: result.text,
        audio: `data:audio/mpeg;base64,${result.audioBuffer.toString('base64')}`,
        duration: result.duration,
      });
    } else {
      res.json({
        success: true,
        text: result.text,
        duration: result.duration,
      });
    }
  } catch (error) {
    console.error("[Voice API] Conversation failed:", error);
    res.status(500).json({
      error: "Conversational interaction failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Voice Capabilities
// =====================================

router.get("/api/voice/capabilities", async (req: any, res) => {
  try {
    const capabilities = await advancedVoiceSystem.getCapabilities();

    res.json({
      success: true,
      capabilities,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get capabilities",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Voice Status
// =====================================

router.get("/api/voice/status", async (req: any, res) => {
  try {
    const capabilities = await advancedVoiceSystem.getCapabilities();

    res.json({
      success: true,
      status: "operational",
      features: {
        naturalSpeech: capabilities.textToSpeech,
        speechRecognition: capabilities.speechToText,
        voiceCloning: capabilities.voiceCloning,
        conversational: capabilities.speechToText && capabilities.textToSpeech,
      },
      provider: capabilities.provider,
      availableVoices: capabilities.voices,
    });
  } catch (error) {
    res.status(500).json({
      error: "Status check failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export { router as voiceRouter };
