import express, { type Express, type Request, type Response } from "express";
import { chatStorage } from "../chat/storage";
import { openai, speechToText, ensureCompatibleFormat } from "./client";

// Body parser with 50MB limit for audio payloads
const audioBodyParser = express.json({ limit: "50mb" });

export function registerAudioRoutes(app: Express): void {
  // Voice/Audio specific conversation endpoints (separate from main CYRUS conversations)
  // Uses /api/voice/* namespace to avoid collision with main /api/conversations
  
  // Get all voice chat conversations
  app.get("/api/voice/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching voice conversations:", error);
      res.status(500).json({ error: "Failed to fetch voice conversations" });
    }
  });

  // Get single voice conversation with messages
  app.get("/api/voice/conversations/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const id = parseInt(typeof idParam === 'string' ? idParam : String(idParam));
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Voice conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching voice conversation:", error);
      res.status(500).json({ error: "Failed to fetch voice conversation" });
    }
  });

  // Create new voice conversation
  app.post("/api/voice/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "Voice Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating voice conversation:", error);
      res.status(500).json({ error: "Failed to create voice conversation" });
    }
  });

  // Delete voice conversation
  app.delete("/api/voice/conversations/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const id = parseInt(typeof idParam === 'string' ? idParam : String(idParam));
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting voice conversation:", error);
      res.status(500).json({ error: "Failed to delete voice conversation" });
    }
  });

  // Send voice message and get streaming audio response
  // Auto-detects audio format and converts WebM/MP4/OGG to WAV
  // Uses gpt-4o-mini-transcribe for STT, gpt-audio for voice response
  app.post("/api/voice/conversations/:id/messages", audioBodyParser, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const conversationId = parseInt(typeof idParam === 'string' ? idParam : String(idParam));
      const { audio, voice = "nova" } = req.body; // "nova" = sweet natural female voice for CYRUS

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      // 1. Auto-detect format and convert to OpenAI-compatible format
      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);

      // 2. Transcribe user audio
      const userTranscript = await speechToText(audioBuffer, inputFormat);

      // 3. Save user message
      await chatStorage.createMessage(conversationId, "user", userTranscript);

      // 4. Get conversation history
      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const chatHistory = existingMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // 5. Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userTranscript })}\n\n`);

      // 6. Stream audio response from gpt-audio
      const stream = await openai.chat.completions.create({
        model: "gpt-audio",
        modalities: ["text", "audio"],
        audio: { voice, format: "pcm16" },
        messages: chatHistory,
        stream: true,
      });

      let assistantTranscript = "";

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta as any;
        if (!delta) continue;

        if (delta?.audio?.transcript) {
          assistantTranscript += delta.audio.transcript;
          res.write(`data: ${JSON.stringify({ type: "transcript", data: delta.audio.transcript })}\n\n`);
        }

        if (delta?.audio?.data) {
          res.write(`data: ${JSON.stringify({ type: "audio", data: delta.audio.data })}\n\n`);
        }
      }

      // 7. Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", assistantTranscript);

      res.write(`data: ${JSON.stringify({ type: "done", transcript: assistantTranscript })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error processing voice message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to process voice message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process voice message" });
      }
    }
  });
}
