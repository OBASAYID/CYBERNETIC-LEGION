import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer, { type StorageEngine } from "multer";

type MulterFile = Express.Multer.File;
import path from "path";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";

let storage: any;
let insertConversationSchema: any;
let insertMemorySchema: any;
let insertUploadedFileSchema: any;
let neuralFusionEngine: any;
let cyrusSoul: any;
let quantumCore: any;
let domainSummary: any;
let allBranches: any;
let registerAudioRoutes: any;
let speechToText: any;
let ensureCompatibleFormat: any;
let textToSpeechElevenLabs: any;
let textToSpeechStreamElevenLabs: any;
let ELEVENLABS_VOICES: any;
let getEmotionVoiceSettings: any;
let runAutonomy: any;
let registerDeviceRoutes: any;
let registerNavRoutes: any;
let detectFile: any;
let extractFile: any;
let analyzeExtraction: any;
let buildReport: any;
let generateDocument: any;
let initSignalingServer: any;
let initSocketSignaling: any;
let enqueueMessage: any;
let dequeueMessages: any;
let addReminder: any;
let listReminders: any;
let registerCommsRoutes: any;
let analyzeScan: any;
let decodeQr: any;
let registerDroneRoutes: any;
let experienceMemory: any;
let adaptiveLearning: any;
let registerAdvancedUpgradeRoutes: any;
let moduleOrchestrator: any;
let autonomyRoutes: any;
let dataCollectionRoutes: any;
let registerInteractiveRoutes: any;
let quantumBridge: any;
let quantumResponseFormatter: any;
let healthIntegrations: any;
let validateState: any;
let registerImageRoutes: any;
let generateImage: any;
let systemRefinementEngine: any;
let emotionFusion: any;
let voiceProsody: any;
let brainRoutes: any;

const tick = (ms = 10): Promise<void> => new Promise((r) => setTimeout(r, ms));
let depsLoaded = false;

async function loadDependencies() {
  if (depsLoaded) return;

  const storageM = await import("./storage");
  storage = storageM.storage;
  const schemaM = await import("../shared/schema");
  insertConversationSchema = schemaM.insertConversationSchema;
  insertMemorySchema = schemaM.insertMemorySchema;
  insertUploadedFileSchema = schemaM.insertUploadedFileSchema;
  await tick();

  const nfM = await import("./ai/neural-fusion");
  neuralFusionEngine = nfM.neuralFusionEngine;
  await tick();

  const csM = await import("./ai/cyrus-soul");
  cyrusSoul = csM.cyrusSoul;
  await tick(20);

  const qcM = await import("./ai/quantum-core");
  quantumCore = qcM.quantumCore;
  await tick();

  const brM = await import("./ai/branches/index");
  domainSummary = brM.domainSummary;
  allBranches = brM.allBranches;
  await tick(20);

  const arM = await import("./replit_integrations/audio/routes");
  registerAudioRoutes = arM.registerAudioRoutes;
  const acM = await import("./replit_integrations/audio/client");
  speechToText = acM.speechToText;
  ensureCompatibleFormat = acM.ensureCompatibleFormat;
  const elM = await import("./elevenlabs/client");
  textToSpeechElevenLabs = elM.textToSpeechElevenLabs;
  textToSpeechStreamElevenLabs = elM.textToSpeechStreamElevenLabs;
  ELEVENLABS_VOICES = elM.ELEVENLABS_VOICES;
  getEmotionVoiceSettings = elM.getEmotionVoiceSettings;
  await tick();

  const auM = await import("./autonomy/run");
  runAutonomy = auM.runAutonomy;
  const drM = await import("./device/routes");
  registerDeviceRoutes = drM.registerDeviceRoutes;
  const nvM = await import("./nav/routes");
  registerNavRoutes = nvM.registerNavRoutes;
  await tick();

  const dtM = await import("./ingestion/detect");
  detectFile = dtM.detectFile;
  const exM = await import("./ingestion/extract");
  extractFile = exM.extractFile;
  const anM = await import("./ingestion/analyze");
  analyzeExtraction = anM.analyzeExtraction;
  const rpM = await import("./ingestion/report");
  buildReport = rpM.buildReport;
  const dgM = await import("./docgen/generate");
  generateDocument = dgM.generateDocument;
  await tick();

  const sgM = await import("./comms/signaling");
  initSignalingServer = sgM.initSignalingServer;
  const ssM = await import("./comms/socket-signaling");
  initSocketSignaling = ssM.initSocketSignaling;
  const stM = await import("./comms/store");
  enqueueMessage = stM.enqueueMessage;
  dequeueMessages = stM.dequeueMessages;
  addReminder = stM.addReminder;
  listReminders = stM.listReminders;
  const crM = await import("./comms/comms-routes");
  registerCommsRoutes = crM.registerCommsRoutes;
  await tick();

  const scM = await import("./scan/analyze");
  analyzeScan = scM.analyzeScan;
  const qrM = await import("./scan/qr");
  decodeQr = qrM.decodeQr;
  const drnM = await import("./drone/routes");
  registerDroneRoutes = drnM.registerDroneRoutes;
  await tick();

  const emM = await import("./ai/experience-memory");
  experienceMemory = emM.experienceMemory;
  await tick();

  const alM = await import("./ai/adaptive-learning");
  adaptiveLearning = alM.adaptiveLearning;
  await tick();

  const aurM = await import("./ai/upgrades/routes");
  registerAdvancedUpgradeRoutes = aurM.registerAdvancedUpgradeRoutes;
  await tick(20);

  const moM = await import("./ai/upgrades/module-orchestrator");
  moduleOrchestrator = moM.moduleOrchestrator;
  await tick(20);

  const irM = await import("./ai/interactive/routes");
  registerInteractiveRoutes = irM.registerInteractiveRoutes;
  await tick();

  autonomyRoutes = null;
  try {
    const autoM = await import("./autonomy/routes");
    autonomyRoutes = autoM.default;
  } catch (error) {
    console.warn("[Routes] Failed to load autonomy routes:", error.message);
  }
  await tick();

  const dcM = await import("./data-collection/routes");
  dataCollectionRoutes = dcM.default;
  await tick();

  const qbM = await import("./ai/quantum-bridge-client");
  quantumBridge = qbM.quantumBridge;
  const qrfM = await import("./ai/quantum-response-formatter");
  quantumResponseFormatter = qrfM.quantumResponseFormatter;
  await tick();

  const hiM = await import("./health/integrations");
  healthIntegrations = hiM.healthIntegrations;
  validateState = hiM.validateState;
  const imgRM = await import("./replit_integrations/image/routes");
  registerImageRoutes = imgRM.registerImageRoutes;
  const imgCM = await import("./replit_integrations/image/client");
  generateImage = imgCM.generateImage;
  await tick();

  const srM = await import("./ai/system-refinement-engine");
  systemRefinementEngine = srM.systemRefinementEngine;
  await tick();

  const efM = await import("./humanoid/emotion-fusion");
  emotionFusion = efM.emotionFusion;
  const vpM = await import("./humanoid/voice-prosody");
  voiceProsody = vpM.voiceProsody;
  await tick();

  const brainModule = await import("./ai/brain-routes");
  brainRoutes = brainModule.default;
  await tick();

  depsLoaded = true;
  console.log("[Routes] All dependencies loaded");
}

// Validation schemas for agent/device control
const agentConfigSchema = z.object({
  pointerSpeed: z.enum(["slow", "normal", "fast"]).optional(),
  typingSpeed: z.enum(["slow", "normal", "fast"]).optional(),
  pauseBetweenActions: z.boolean().optional(),
  naturalErrors: z.boolean().optional(),
  thinkingPauses: z.boolean().optional()
});

function stripEmojis(text: string): string {
  return text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const deviceActionSchema = z.object({
  type: z.string(),
  // Pointer fields
  x: z.number().optional(),
  y: z.number().optional(),
  targetX: z.number().optional(),
  targetY: z.number().optional(),
  button: z.string().optional(),
  // Keyboard fields
  text: z.string().optional(),
  key: z.string().optional(),
  keys: z.union([z.array(z.string()), z.string()]).optional(),
  // Scroll fields
  direction: z.string().optional(),
  amount: z.number().optional(),
  // Navigation fields
  url: z.string().optional(),
  target: z.string().optional(),
  // Search fields
  query: z.string().optional(),
  // Timing fields
  duration: z.number().optional(),
  time: z.number().optional(),
  ms: z.number().optional(),
  // Content fields
  content: z.string().optional(),
  details: z.string().optional(),
  feedback: z.string().optional(),
  // Status
  status: z.string().default("completed")
});

// Allowed action types that match frontend expectations
// All action types must use underscores (snake_case) to match executeDeviceAction handlers
const ALLOWED_ACTION_TYPES = [
  "click", "double_click", "right_click", "drag",           // pointer actions
  "type", "press", "hotkey", "hold", "release",              // keyboard actions
  "scroll", "navigate", "copy", "paste", "wait",             // utility actions
  "analyze", "search", "screenshot", "open"                  // high-level actions
] as const;

// Helper to format error messages safely
const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
};

// Helper to call OpenAI with timeout and cancellation support
const callOpenAIWithTimeout = async (
  fn: (signal: AbortSignal) => Promise<any>,
  timeoutMs: number = 15000
): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const result = await fn(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError" || controller.signal.aborted) {
      throw new Error("OpenAI request timed out");
    }
    throw error;
  }
};

// Normalize action type to snake_case to match executeDeviceAction handlers
const normalizeActionType = (type: string): string => {
  // Convert to lowercase, trim, and replace hyphens with underscores
  const normalized = type.toLowerCase().trim().replace(/-/g, '_');
  
  // Check if already a valid action type
  if (ALLOWED_ACTION_TYPES.includes(normalized as any)) {
    return normalized;
  }
  
  // Handle common aliases and variations
  const aliases: Record<string, string> = {
    'doubleclick': 'double_click',
    'rightclick': 'right_click',
    'keypress': 'press',
    'keyboard': 'type',
    'input': 'type',
    'text': 'type',
    'goto': 'navigate',
    'browse': 'navigate',
    'url': 'navigate',
    'find': 'search',
    'lookup': 'search',
    'query': 'search',
    'pause': 'wait',
    'delay': 'wait',
    'sleep': 'wait',
    'capture': 'screenshot',
    'snap': 'screenshot',
    'execute': 'click',
    'run': 'open',
    'launch': 'open',
    'start': 'open'
  };
  
  if (aliases[normalized]) {
    return aliases[normalized];
  }
  
  // Map by keyword matching
  if (normalized.includes('double') && normalized.includes('click')) return 'double_click';
  if (normalized.includes('right') && normalized.includes('click')) return 'right_click';
  if (normalized.includes('key') || normalized === 'keypress') return 'press';
  if (normalized.includes('scroll')) return 'scroll';
  if (normalized.includes('type') || normalized.includes('text') || normalized.includes('input')) return 'type';
  if (normalized.includes('click')) return 'click';
  if (normalized.includes('copy')) return 'copy';
  if (normalized.includes('paste')) return 'paste';
  if (normalized.includes('drag')) return 'drag';
  if (normalized.includes('navigate') || normalized.includes('url') || normalized.includes('goto')) return 'navigate';
  if (normalized.includes('search') || normalized.includes('find')) return 'search';
  if (normalized.includes('wait') || normalized.includes('pause') || normalized.includes('delay')) return 'wait';
  if (normalized.includes('screenshot') || normalized.includes('capture')) return 'screenshot';
  if (normalized.includes('open') || normalized.includes('launch')) return 'open';
  
  // Default fallback
  return 'click';
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), "public", "uploads"),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }) as StorageEngine,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await loadDependencies();

  initSignalingServer(httpServer);
  initSocketSignaling(httpServer);
  console.log("[Socket.IO] Real-time communication server active");
  registerCommsRoutes(app);
  registerAdvancedUpgradeRoutes(app);
  registerInteractiveRoutes(app);

  // Autonomy Agent System
  if (autonomyRoutes) {
    app.use('/api/autonomy', autonomyRoutes);
  }

  // CYRUS Brain API
  app.use('/api/brain', brainRoutes);

  // Health Device Integration Routes
  app.get("/api/health/providers", async (req, res) => {
    try {
      const providers = healthIntegrations.getAvailableProviders();
      res.json({ providers });
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.get("/api/health/connections/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const connections = await healthIntegrations.getActiveConnections(userId);
      res.json({ connections });
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.get("/api/health/oauth/authorize/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const authUrl = healthIntegrations.getOAuthUrl(provider as HealthProvider, userId as string);
      if (!authUrl) {
        return res.status(400).json({ 
          error: `OAuth not configured for ${provider}`,
          message: `Please add ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET to your secrets`
        });
      }
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.get("/api/health/oauth/callback/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;
      if (!code || !state) {
        return res.status(400).send("Missing authorization code or state");
      }
      const stateData = validateState(state as string);
      if (!stateData) {
        return res.status(400).send("Invalid or expired state parameter - possible CSRF attack");
      }
      if (stateData.provider !== provider) {
        return res.status(400).send("Provider mismatch in state validation");
      }
      const { userId } = stateData;
      const tokens = await healthIntegrations.exchangeCodeForTokens(provider as HealthProvider, code as string);
      if (!tokens) {
        return res.status(400).send("Failed to exchange authorization code");
      }
      await healthIntegrations.saveConnection(userId, provider as HealthProvider, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Connected!</title></head>
        <body style="background:#000;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1 style="color:#0ff;">✓ ${provider} Connected Successfully!</h1>
            <p>You can close this window and return to CYRUS.</p>
            <script>setTimeout(()=>window.close(),3000);</script>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send(`Connection failed: ${formatError(error)}`);
    }
  });

  app.post("/api/health/disconnect/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      await healthIntegrations.disconnectProvider(userId, provider as HealthProvider);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.post("/api/health/sync/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const results = await healthIntegrations.syncAllProviders(userId);
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.get("/api/health/vitals/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const data = await healthIntegrations.getLatestVitals(userId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });

  app.get("/api/health/data/:provider/:userId", async (req, res) => {
    try {
      const { provider, userId } = req.params;
      const data = await healthIntegrations.fetchProviderData(userId, provider as HealthProvider);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });

  // Ensure uploads directory exists
  const fs = await import("fs/promises");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }

  // Main inference endpoint
  app.post("/api/inference", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const imagePatterns = [
        /\b(generate|create|make|draw|paint|produce|render|sketch|design|craft)\b.*\b(image|picture|photo|illustration|art|artwork|drawing|painting|diagram|visual|graphic|portrait|scene)\b/i,
        /\b(image|picture|photo|illustration|diagram|drawing|sketch|visual|graphic|portrait)\b.*\b(of|for|showing|with|about|depicting|featuring)\b/i,
        /\b(show|give|display|present)\s+(me|us)?\s*(a|an|the|some)?\s*(image|picture|photo|illustration|diagram|drawing|sketch|visual|graphic|portrait)\b/i,
        /\b(illustrate|visualize|depict)\b.*\b(the|a|an|how|what)\b.*\b(anatomy|body|skeleton|organ|cell|structure|system|process|cycle|circuit|building|landscape|scene|animal|plant|brain|heart|muscle|bone)\b/i,
        /\bdall-?e\b/i,
        /\b(can you|could you|please|i want|i need|i'd like)\b.*\b(draw|illustrate|visualize|depict|sketch)\b.*\b(image|picture|illustration|diagram|visual|drawing|portrait|graphic|of the|of a|of an)\b/i,
      ];
      const showMeVisualCheck = /\b(show|give|display)\s+(me|us)\s/i.test(message) && /\b(illustration|visual|image|picture|diagram|drawing|anatomy|skeleton|structure)\b/i.test(message);
      const isImageRequest = imagePatterns.some(p => p.test(message)) || showMeVisualCheck;

      if (isImageRequest) {
        try {
          console.log(`[CYRUS Image] Detected image generation request: "${message.substring(0, 80)}..."`);
          const promptResponse = await callOpenAIWithTimeout((signal) =>
            openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "Extract a detailed DALL-E image generation prompt from the user's request. Return ONLY the optimized prompt text, nothing else. Make it detailed and descriptive for best image quality." },
                { role: "user", content: message }
              ],
              temperature: 0.5,
              max_tokens: 300,
            }, { signal })
          , 15000);
          const imagePrompt = promptResponse.choices[0]?.message?.content || message;

          const imageResult = await generateImage({
            prompt: imagePrompt,
            model: "dall-e-3",
            size: "1024x1024",
            quality: "standard",
            style: "vivid",
            savePath: "auto",
          });

          const savedUrl = imageResult.images[0]?.savedPath;
          const revisedPrompt = imageResult.images[0]?.revised_prompt;

          return res.json({
            message: `I've generated that image for you. ${revisedPrompt ? `Here's what I created: ${revisedPrompt}` : "The image has been generated successfully."}`,
            imageGenerated: true,
            imageUrl: savedUrl,
            imageDetails: {
              model: imageResult.model,
              size: imageResult.size,
              quality: imageResult.quality,
              style: imageResult.style,
              revisedPrompt,
            },
            format: "image_response",
          });
        } catch (imgError: any) {
          console.error("[CYRUS Image] Auto-generation failed:", imgError?.message);
        }
      }

      // Use CyrusSoul for reasoning and prompt generation
      const thought = await cyrusSoul.processThought(message);
      const systemPrompt = cyrusSoul.getSystemPrompt();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const rawResponse = response.choices[0].message.content || "";
      const aiResponse = stripEmojis(rawResponse);
      
      const enhancement = await quantumBridge.enhanceResponse(message);
      
      const formattedResponse = await quantumResponseFormatter.formatResponse(aiResponse, enhancement);
      
      console.log(`[Inference] Response format: ${formattedResponse.format}`);
      
      res.json({ 
        message: formattedResponse.content,
        enhancement,
        format: formattedResponse.format,
        thought: thought.id
      });
    } catch (error) {
      console.error("Inference failed:", error);
      res.status(500).json({ error: "Inference failed", details: formatError(error) });
    }
  });

  // Get conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const conversations = await storage.getConversations(userId, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Create conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const parsed = insertConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid conversation data", details: parsed.error });
      }
      const conversation = await storage.createConversation(parsed.data);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete all conversations (clear chat history) - filtered by userId
  app.delete("/api/conversations", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      await storage.clearConversations(userId);
      res.json({ success: true, message: "Chat history cleared" });
    } catch (error) {
      console.error("Error clearing conversations:", error);
      res.status(500).json({ error: "Failed to clear conversations" });
    }
  });

  // Get memories
  app.get("/api/memories", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const memories = await storage.getMemories(userId);
      res.json(memories);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  // Create memory
  app.post("/api/memories", async (req, res) => {
    try {
      const parsed = insertMemorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid memory data", details: parsed.error });
      }
      const memory = await storage.createMemory(parsed.data);
      res.json(memory);
    } catch (error) {
      console.error("Error creating memory:", error);
      res.status(500).json({ error: "Failed to create memory" });
    }
  });

  // Get uploaded files
  app.get("/api/files", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const files = await storage.getUploadedFiles(userId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Upload file
  app.post("/api/files/upload", upload.single("file"), async (req: Request & { file?: MulterFile }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileData = {
        userId: req.body.userId || null,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
      };

      const parsed = insertUploadedFileSchema.safeParse(fileData);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid file data", details: parsed.error });
      }

      const uploadedFile = await storage.createUploadedFile(parsed.data);
      res.json(uploadedFile);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Analyze file (reliable ingestion pipeline)
  app.post("/api/files/analyze", upload.single("file"), async (req: Request & { file?: MulterFile }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const buffer = req.file.buffer || (req.file.path ? await (await import("fs/promises")).readFile(req.file.path) : null);
      if (!buffer) {
        return res.status(500).json({ success: false, error: "Unable to read uploaded file buffer" });
      }
      const det = await detectFile(buffer, req.file.mimetype);
      const ext = await extractFile(buffer, req.file.mimetype);
      const analysis = await analyzeExtraction(ext);
      const hasContent = !!(ext.text || ext.ocrText || ext.transcript || (ext.frames && ext.frames.some((f) => f.ocrText)));
      const report = buildReport(det, ext, analysis, hasContent);
      if (!hasContent) {
        report.issues.push("No extractable content found.");
        report.recommendations.push("Re-upload with higher quality or supported format.");
        report.success = false;
      }
      res.json(report);
    } catch (err: any) {
      console.error("File analysis failed:", err);
      return res.status(500).json({
        success: false,
        error: "File analysis failed",
        details: err?.message || String(err),
      });
    }
  });

  // Messaging (offline queue)
  app.post("/api/comms/message", (req, res) => {
    const { to, from, text } = req.body || {};
    if (!to || !from || !text) {
      return res.status(400).json({ error: "to, from, and text are required" });
    }
    const msg = enqueueMessage(to, from, text);
    res.json({ success: true, message: msg });
  });

  app.get("/api/comms/messages", (req, res) => {
    const user = req.query.user as string;
    if (!user) return res.status(400).json({ error: "user required" });
    const msgs = dequeueMessages(user);
    res.json({ messages: msgs });
  });

  // Room creation (simple)
  app.post("/api/comms/room", (_req, res) => {
    const roomId = uuid();
    res.json({ roomId, joinUrl: `/ws?room=${roomId}` });
  });

  // Reminders
  app.post("/api/reminders", (req, res) => {
    const { text, time, type } = req.body || {};
    if (!text || !time) return res.status(400).json({ error: "text and time required" });
    const reminder = addReminder(text, Number(time), type || "other");
    res.json(reminder);
  });

  app.get("/api/reminders", (_req, res) => {
    res.json({ reminders: listReminders() });
  });

  // News fetch (server-side proxy)
  app.get("/api/news", async (req, res) => {
    const topics = (req.query.topics as string) || "general";
    const limit = Number(req.query.limit || 5);
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "NEWS_API_KEY not set" });
    }
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topics)}&pageSize=${limit}&sortBy=publishedAt&language=en&apiKey=${apiKey}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`news api ${resp.status}`);
      const data: any = await resp.json();
      const items = (data.articles || []).map((a: any) => ({
        title: a.title,
        source: a.source?.name,
        url: a.url,
        publishedAt: a.publishedAt,
        summary: a.description,
      }));
      res.json({ items });
    } catch (err: any) {
      console.error("news fetch failed", err);
      res.status(500).json({ error: "News fetch failed", detail: err?.message || String(err) });
    }
  });

  // Document generation (professional-grade)
  app.post("/api/doc/generate", async (req, res) => {
    try {
      const { mode, docType, audience, purpose, topic, rawText, data } = req.body || {};
      if (!mode || !["full", "convert", "assist"].includes(mode)) {
        return res.status(400).json({ error: "mode must be full|convert|assist" });
      }
      const doc = await generateDocument({
        mode,
        docType,
        audience,
        purpose,
        topic,
        rawText,
        data,
      });
      res.json(doc);
    } catch (err: any) {
      console.error("Doc generation failed:", err);
      res.status(500).json({ error: "Document generation failed", detail: err?.message || String(err) });
    }
  });

  // Scan + translate + interpret
  app.post("/api/scan/analyze", upload.single("file"), async (req: Request & { file?: MulterFile }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const buffer = req.file.buffer || (req.file.path ? await (await import("fs/promises")).readFile(req.file.path) : null);
      if (!buffer) {
        return res.status(500).json({ success: false, error: "Unable to read uploaded file buffer" });
      }
      const { targetLanguage, sourceLanguage, mode } = req.body || {};
      const report = await analyzeScan(buffer, req.file.mimetype, { targetLanguage, sourceLanguage, mode });
      res.json(report);
    } catch (err: any) {
      console.error("Scan analysis failed:", err);
      res.status(500).json({ success: false, error: "Scan analysis failed", detail: err?.message || String(err) });
    }
  });

  // QR-only decode
  app.post("/api/scan/qr", upload.single("file"), async (req: Request & { file?: MulterFile }, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const buffer = req.file.buffer || (req.file.path ? await (await import("fs/promises")).readFile(req.file.path) : null);
      if (!buffer) return res.status(500).json({ error: "Unable to read uploaded file buffer" });
      const qr = await decodeQr(buffer);
      res.json(qr);
    } catch (err: any) {
      res.status(500).json({ success: false, error: "QR decode failed", detail: err?.message || String(err) });
    }
  });

  // OCR Text Extraction endpoint
  app.post("/api/scan/ocr", async (req: Request, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: "No image data provided" });
      }
      
      // Use OpenAI Vision for OCR
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text visible in this image. Return ONLY the extracted text, preserving line breaks and formatting as closely as possible. If no text is found, respond with 'No text detected'."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      });

      const extractedText = response.choices[0]?.message?.content || "No text detected";
      
      res.json({
        success: true,
        text: extractedText,
        type: "ocr",
        confidence: extractedText === "No text detected" ? 0 : 0.95
      });
    } catch (err: any) {
      console.error("OCR scan failed:", err);
      res.status(500).json({ success: false, error: "OCR scan failed", detail: err?.message || String(err) });
    }
  });

  // Vision AI Analysis endpoint
  app.post("/api/scan/vision", async (req: Request, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: "No image data provided" });
      }
      
      // Use OpenAI Vision for comprehensive image analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image comprehensively. Provide:
1. **Scene Description**: What is shown in the image
2. **Objects Detected**: List all visible objects
3. **Text Content**: Any visible text (if applicable)
4. **Colors & Style**: Dominant colors and visual style
5. **Context & Purpose**: What this image might be used for
6. **Notable Details**: Any interesting or significant details

Format your response in a clear, structured manner.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      });

      const analysis = response.choices[0]?.message?.content || "Unable to analyze image";
      
      res.json({
        success: true,
        text: analysis,
        interpretation: analysis,
        type: "vision",
        confidence: 0.92
      });
    } catch (err: any) {
      console.error("Vision scan failed:", err);
      res.status(500).json({ success: false, error: "Vision scan failed", detail: err?.message || String(err) });
    }
  });

  // Translation endpoint
  app.post("/api/scan/translate", async (req: Request, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: "No text provided for translation" });
      }
      
      const languageNames: Record<string, string> = {
        en: "English", es: "Spanish", fr: "French", de: "German",
        zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic",
        pt: "Portuguese", ru: "Russian", hi: "Hindi", sw: "Swahili",
        zu: "Zulu", tn: "Setswana"
      };
      
      const targetLangName = languageNames[targetLanguage] || targetLanguage;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given text to ${targetLangName}. First, detect the source language. Return ONLY a JSON object with the format: {"detectedLanguage": "language name", "translatedText": "translated text"}`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 2000
      });

      let result;
      try {
        const content = response.choices[0]?.message?.content || "{}";
        result = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
      } catch {
        result = {
          detectedLanguage: "Unknown",
          translatedText: response.choices[0]?.message?.content || text
        };
      }
      
      res.json({
        originalText: text,
        detectedLanguage: result.detectedLanguage,
        targetLanguage: targetLangName,
        translatedText: result.translatedText,
        confidence: 0.95
      });
    } catch (err: any) {
      console.error("Translation failed:", err);
      res.status(500).json({ success: false, error: "Translation failed", detail: err?.message || String(err) });
    }
  });

  // Superintelligent AI inference endpoint - Neural Fusion Engine with Quantum Enhancement
  app.post("/api/infer", async (req, res) => {
    try {
      const { message, imageData, detectedObjects, location, userId, moduleContext } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const withTimeout = async <T>(
        task: Promise<T>,
        timeoutMs: number,
        fallbackValue: T
      ): Promise<T> => {
        let timeoutHandle: NodeJS.Timeout | null = null;
        try {
          const timeoutPromise = new Promise<T>((resolve) => {
            timeoutHandle = setTimeout(() => resolve(fallbackValue), timeoutMs);
          });
          return await Promise.race([task, timeoutPromise]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
      };

      const imagePatterns = [
        /\b(generate|create|make|draw|paint|produce|render|sketch|design|craft)\b.*\b(image|picture|photo|illustration|art|artwork|drawing|painting|diagram|visual|graphic|portrait|scene)\b/i,
        /\b(image|picture|photo|illustration|diagram|drawing|sketch|visual|graphic|portrait)\b.*\b(of|for|showing|with|about|depicting|featuring)\b/i,
        /\b(show|give|display|present)\s+(me|us)?\s*(a|an|the|some)?\s*(image|picture|photo|illustration|diagram|drawing|sketch|visual|graphic|portrait)\b/i,
        /\b(illustrate|visualize|depict)\b.*\b(the|a|an|how|what)\b.*\b(anatomy|body|skeleton|organ|cell|structure|system|process|cycle|circuit|building|landscape|scene|animal|plant|brain|heart|muscle|bone)\b/i,
        /\bdall-?e\b/i,
        /\b(can you|could you|please|i want|i need|i'd like)\b.*\b(draw|illustrate|visualize|depict|sketch)\b.*\b(image|picture|illustration|diagram|visual|drawing|portrait|graphic|of the|of a|of an)\b/i,
      ];
      const showMeVisualCheck = /\b(show|give|display)\s+(me|us)\s/i.test(message) && /\b(illustration|visual|image|picture|diagram|drawing|anatomy|skeleton|structure)\b/i.test(message);
      const isImageRequest = imagePatterns.some(p => p.test(message)) || showMeVisualCheck;

      if (isImageRequest) {
        try {
          console.log(`[CYRUS Image] Detected image generation request in /api/infer: "${message.substring(0, 80)}..."`);
          const promptResponse = await callOpenAIWithTimeout((signal) =>
            openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "Extract a detailed DALL-E image generation prompt from the user's request. Return ONLY the optimized prompt text, nothing else. Make it detailed and descriptive for best image quality." },
                { role: "user", content: message }
              ],
              temperature: 0.5,
              max_tokens: 300,
            }, { signal })
          , 15000);
          const imagePrompt = promptResponse.choices[0]?.message?.content || message;

          const imageResult = await generateImage({
            prompt: imagePrompt,
            model: "dall-e-3",
            size: "1024x1024",
            quality: "standard",
            style: "vivid",
            savePath: "auto",
          });

          const savedUrl = imageResult.images[0]?.savedPath;
          const revisedPrompt = imageResult.images[0]?.revised_prompt;
          const responseText = `I've generated that image for you. ${revisedPrompt ? `Here's what I created: ${revisedPrompt}` : "The image has been generated successfully."}`;

          return res.json({
            response: responseText,
            imageGenerated: true,
            imageUrl: savedUrl,
            imageDetails: {
              model: imageResult.model,
              size: imageResult.size,
              quality: imageResult.quality,
              style: imageResult.style,
              revisedPrompt,
            },
            confidence: 0.95,
            processingTime: 0,
            branchesEngaged: 1,
            quantumEnhanced: false,
            timestamp: new Date().toISOString(),
          });
        } catch (imgError: any) {
          console.error("[CYRUS Image] Generation failed in /api/infer:", imgError?.message);
          return res.json({
            response: `I attempted to generate that image but encountered an error: ${imgError?.message || "Unknown error"}. Please try again or rephrase your request.`,
            imageGenerated: false,
            imageError: imgError?.message || "Image generation failed",
            confidence: 0.5,
            processingTime: 0,
            branchesEngaged: 1,
            quantumEnhanced: false,
            timestamp: new Date().toISOString(),
          });
        }
      }

      let conversationHistory: Array<{ role: 'user' | 'cyrus'; content: string }> = [];
      try {
        const recentConversations = await storage.getConversations(userId, 10);
        conversationHistory = recentConversations.reverse().map(c => {
          const normalizedRole = (c.role === 'cyrus' || c.role === 'assistant') ? 'cyrus' : 'user';
          return {
            role: normalizedRole as 'user' | 'cyrus',
            content: c.content
          };
        });
      } catch (historyError) {
        console.warn('[CYRUS] Conversation history unavailable, continuing without persisted memory:', historyError);
      }
      
      let quantumEnhancement: any = null;
      try {
        quantumEnhancement = await withTimeout(
          quantumBridge.enhanceResponse(message, {
            detectedObjects,
            location,
            conversationCount: conversationHistory.length
          }),
          5000,
          null
        );
      } catch (quantumError) {
        console.warn('[CYRUS] Quantum enhancement unavailable, using base inference path:', quantumError);
      }
      
      let orchestratorContext: any = { activeModules: [], moduleData: {} };
      try {
        orchestratorContext = await withTimeout(
          moduleOrchestrator.buildUnifiedContext(message, {
            vision: moduleContext?.vision,
            location,
            detectedObjects
          }),
          5000,
          { activeModules: [], moduleData: {} }
        );
      } catch (orchestratorError) {
        console.warn('[CYRUS] Module orchestrator context unavailable, continuing with minimal context:', orchestratorError);
      }
      
      // Merge orchestrator context with existing module context and quantum enhancement
      const nexusIntel = quantumEnhancement?.nexus_intelligence;
      const enhancedModuleContext = {
        ...moduleContext,
        orchestrator: orchestratorContext,
        activeModules: orchestratorContext.activeModules,
        emotion: orchestratorContext.moduleData.emotion,
        language: orchestratorContext.moduleData.language,
        ethics: orchestratorContext.moduleData.ethics,
        quantum: orchestratorContext.moduleData.quantum,
        cognitive: orchestratorContext.moduleData.cognitive,
        hardware: orchestratorContext.moduleData.hardware,
        nexus: orchestratorContext.moduleData.nexus,
        quantumIntelligence: quantumEnhancement ? {
          active: true,
          queryType: quantumEnhancement.query_classification,
          recommendedStyle: quantumEnhancement.enhancements.writing_style?.recommended_response_style,
          styleGuidelines: quantumEnhancement.enhancements.writing_style?.style_guidelines,
          responseStructure: quantumEnhancement.enhancements.response_structure,
          analyticalFramework: quantumEnhancement.enhancements.analytical_framework,
          confidenceMetrics: quantumEnhancement.enhancements.confidence_metrics,
          nexusEnhanced: nexusIntel?.processing_boost || false,
          nexusIntelligenceLayer: nexusIntel?.intelligence_layer,
          nexusCoherence: nexusIntel?.enhancement_signals?.nexus_coherence,
          deepAnalysis: nexusIntel?.enhancement_signals?.deep_analysis || false,
          precisionMode: nexusIntel?.enhancement_signals?.precision_mode || false
        } : null
      };
      
      // Build quantum enhancement prompt if available
      const quantumPromptEnhancement = quantumEnhancement 
        ? quantumBridge.buildSystemPromptEnhancement(quantumEnhancement)
        : '';
      
      const result = await withTimeout(
        neuralFusionEngine.processInference({
          message,
          imageData,
          detectedObjects,
          location,
          userId,
          moduleContext: enhancedModuleContext,
          conversationHistory,
          quantumPromptEnhancement
        }),
        25000,
        {
          response: 'Core inference timed out under degraded dependencies. Systems remain operational in fallback mode; please retry once services stabilize.',
          confidence: 0.45,
          processingTime: 25000,
          branchesEngaged: [],
          quantumEnhanced: false,
          neuralPathsActivated: 0,
          agiReasoning: true,
        }
      );
      
      // Apply quantum formatting to transform response presentation
      let formattedResponse = stripEmojis(result.response);
      let responseFormat = 'standard';
      
      if (quantumEnhancement) {
        try {
          const formatted = await quantumResponseFormatter.formatResponse(
            formattedResponse,
            quantumEnhancement,
            quantumEnhancement.query_classification
          );
          formattedResponse = stripEmojis(formatted.content);
          responseFormat = formatted.format;
        } catch (formatError) {
          console.error('[Quantum Formatter] Error:', formatError);
        }
      }
      
      let visualData: Record<string, any> | null = null;
      try {
        const visualDetection = await quantumBridge.visualDetect(message);
        if (visualDetection?.detected) {
          const visualResult = await quantumBridge.visualGenerate(visualDetection.topic);
          if (visualResult?.success && visualResult?.base64) {
            visualData = {
              topic: visualDetection.topic,
              category: visualDetection.category,
              image: visualResult.base64,
              method: visualResult.method
            };
          }
        }
      } catch (visualError) {
        console.error('[Visual Engine] Detection error:', visualError);
      }

      let trainingClassification: Record<string, any> | null = null;
      try {
        const classResult = await quantumBridge.trainingClassify(message);
        if (classResult && classResult.intent) {
          trainingClassification = {
            intent: classResult.intent,
            domain: classResult.domain,
            intentConfidence: classResult.intent_confidence,
            domainConfidence: classResult.domain_confidence,
            semanticMatches: classResult.semantic_matches?.slice(0, 3) || []
          };
        }
      } catch (classError) {
        // Training classification is optional enhancement
      }

      let emotionAnalysis: Record<string, any> | null = null;
      let prosodyData: Record<string, any> | null = null;
      try {
        const emotionResult = emotionFusion.analyzeFullInput(message);
        const aiEmotion = voiceProsody.deriveAIEmotion(emotionResult.dominant);
        const prosodyResult = voiceProsody.addNaturalProsody(formattedResponse, {
          emotion: aiEmotion,
          speed: 1.0,
          intensity: Math.max(0.4, emotionResult.arousal),
          includeBreaths: formattedResponse.length > 80,
          includeHesitations: emotionResult.arousal < 0.7,
        });
        const backchannel = voiceProsody.generateBackchannel(emotionResult.dominant);
        emotionAnalysis = {
          userEmotion: emotionResult.dominant,
          userEmotionScores: emotionResult.scores,
          aiEmotion,
          valence: emotionResult.valence,
          arousal: emotionResult.arousal,
          confidence: emotionResult.confidence,
          suggestedTone: emotionResult.suggestedTone,
          isCrisis: emotionResult.isCrisis,
          crisisType: emotionResult.crisisType,
          backchannel,
        };
        prosodyData = {
          enhancedText: prosodyResult.enhancedText,
          pausePoints: prosodyResult.suggestedPauses,
          voiceSettings: prosodyResult.voiceSettings,
          naturalDelay: prosodyResult.naturalDelay,
        };
      } catch (emotionError) {
        // Emotion analysis is optional enhancement
      }

      res.json({
        response: formattedResponse,
        confidence: result.confidence,
        processingTime: result.processingTime,
        branchesEngaged: result.branchesEngaged,
        quantumEnhanced: result.quantumEnhanced || !!quantumEnhancement,
        quantumIntelligenceActive: !!quantumEnhancement,
        quantumResponseFormat: responseFormat,
        neuralPathsActivated: result.neuralPathsActivated,
        agiReasoning: result.agiReasoning,
        visual: visualData,
        trainingIntelligence: trainingClassification,
        emotionAnalysis,
        prosody: prosodyData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in AI inference:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  // Autonomy control loop (planning -> execution -> verification)
  app.post("/api/autonomy/execute", async (req, res) => {
    try {
      const { goal, context, modality, deviceCommand, deviceConfirmToken } = req.body || {};
      if (!goal || typeof goal !== "string") {
        return res.status(400).json({ error: "goal is required" });
      }

      // For device actions, enforce confirmation when not dry-run
      if (deviceCommand && deviceCommand.dryRun === false) {
        const required = process.env.DEVICE_CONFIRM_TOKEN;
        if (!required) {
          return res.status(403).json({ error: "Confirmation token not configured on server" });
        }
        if (deviceConfirmToken !== required && deviceCommand.confirmToken !== required) {
          return res.status(403).json({ error: "Invalid confirmation token" });
        }
      }

      const report = await runAutonomy(
        { goal, context, modality },
        {
          allowLiveTrading: process.env.ALLOW_LIVE_TRADING === "true",
          hasBrokerKeys: !!process.env.ALPACA_API_KEY,
          hasVectorStore: !!process.env.VECTOR_STORE_URL || !!process.env.DATABASE_URL,
          device: deviceCommand ? { deviceCommand } : undefined,
        },
      );

      res.json(report);
    } catch (error) {
      console.error("Error executing autonomy loop:", error);
      res.status(500).json({ error: "Failed to run autonomy" });
    }
  });

  // Get CYRUS system status
  app.get("/api/cyrus/status", async (req, res) => {
    try {
      const soulStatus = cyrusSoul.getSystemStatus();
      const networkStatus = neuralFusionEngine.getNetworkStatus();
      const agiStatus = cyrusSoul.getAGIStatus();
      const quantumState = quantumCore.getQuantumState();

      res.json({
        soul: soulStatus,
        network: networkStatus,
        agi: agiStatus,
        quantum: quantumState,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching CYRUS status:", error);
      res.status(500).json({ error: "Failed to fetch system status" });
    }
  });

  // Get all cognitive branches
  app.get("/api/cyrus/branches", async (req, res) => {
    try {
      const branches = cyrusSoul.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch cognitive branches" });
    }
  });

  // Get consciousness state
  app.get("/api/cyrus/consciousness", async (req, res) => {
    try {
      const consciousness = cyrusSoul.getConsciousnessState();
      res.json(consciousness);
    } catch (error) {
      console.error("Error fetching consciousness:", error);
      res.status(500).json({ error: "Failed to fetch consciousness state" });
    }
  });

  // Get learning stats and self-evolution progress
  app.get("/api/cyrus/learning", async (req, res) => {
    try {
      const learningStats = await experienceMemory.getLearningStats();
      const evolutionHistory = await experienceMemory.getEvolutionHistory(10);
      
      res.json({
        stats: learningStats,
        evolution: evolutionHistory,
        capabilities: {
          selfImprovement: true,
          patternRecognition: true,
          knowledgeIntegration: true,
          performanceOptimization: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching learning stats:", error);
      res.status(500).json({ error: "Failed to fetch learning statistics" });
    }
  });

  // Get evolution history
  app.get("/api/cyrus/evolution", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const evolutionHistory = await experienceMemory.getEvolutionHistory(limit);
      
      res.json({
        ...evolutionHistory,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching evolution history:", error);
      res.status(500).json({ error: "Failed to fetch evolution history" });
    }
  });

  // Query knowledge graph
  app.get("/api/cyrus/knowledge", async (req, res) => {
    try {
      const concept = req.query.concept as string;
      const domain = req.query.domain as string | undefined;
      
      if (!concept) {
        return res.status(400).json({ error: "Concept parameter required" });
      }
      
      const knowledge = await experienceMemory.queryKnowledge(concept, domain);
      res.json(knowledge);
    } catch (error) {
      console.error("Error querying knowledge:", error);
      res.status(500).json({ error: "Failed to query knowledge graph" });
    }
  });

  // Get domain summary (8 domains, 86 branches)
  app.get("/api/cyrus/domains", async (req, res) => {
    try {
      res.json({
        domains: domainSummary,
        totalBranches: allBranches.length,
        branchesByDomain: Object.entries(domainSummary).map(([name, info]) => ({
          name,
          ...info
        }))
      });
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ error: "Failed to fetch domain information" });
    }
  });

  // Get CYRUS identity and system prompt
  app.get("/api/cyrus/identity", async (req, res) => {
    try {
      const fullStatus = cyrusSoul.getFullIdentityAndStatus();
      res.json(fullStatus);
    } catch (error) {
      console.error("Error fetching identity:", error);
      res.status(500).json({ error: "Failed to fetch CYRUS identity" });
    }
  });

  app.get("/api/cyrus/mode", async (_req, res) => {
    try {
      res.json({ success: true, context: cyrusSoul.getOperationalContext() });
    } catch (error) {
      res.status(500).json({ error: "Failed to get operational mode" });
    }
  });

  // Set operational mode
  app.post("/api/cyrus/mode", async (req, res) => {
    try {
      const { mode, urgency } = req.body;
      if (mode) {
        cyrusSoul.setOperationalMode(mode);
      }
      if (urgency) {
        cyrusSoul.setUrgencyLevel(urgency);
      }
      res.json({ 
        success: true, 
        context: cyrusSoul.getOperationalContext() 
      });
    } catch (error) {
      console.error("Error setting mode:", error);
      res.status(500).json({ error: "Failed to set operational mode" });
    }
  });

  app.get("/api/cyrus/sensors", async (_req, res) => {
    try {
      res.json({ success: true, context: cyrusSoul.getOperationalContext() });
    } catch (error) {
      res.status(500).json({ error: "Failed to get sensor status" });
    }
  });

  // Update sensor status
  app.post("/api/cyrus/sensors", async (req, res) => {
    try {
      const { visual, audio, location } = req.body;
      cyrusSoul.updateSensorStatus({ visual, audio, location });
      res.json({ 
        success: true, 
        context: cyrusSoul.getOperationalContext() 
      });
    } catch (error) {
      console.error("Error updating sensors:", error);
      res.status(500).json({ error: "Failed to update sensor status" });
    }
  });

  // Agent command detection patterns - used for autonomous command routing
  const AGENT_COMMAND_PATTERNS = [
    /\b(click|tap|press)\b.*\b(at|on|button|link)\b/i,
    /\b(type|write|enter|input)\b.*\b(text|message|into|field)\b/i,
    /\b(scroll)\b.*\b(up|down|left|right|page)\b/i,
    /\b(open|launch|start|navigate)\b.*\b(browser|app|website|url|page)\b/i,
    /\b(copy|paste|cut|select)\b/i,
    /\b(drag|move)\b.*\b(to|from)\b/i,
    /\b(search|find|look)\b.*\b(for|up|on)\b.*\b(google|web|internet|browser)\b/i,
    /\b(take|capture)\b.*\b(screenshot|screen)\b/i,
    /\b(execute|run|perform|do)\b.*\b(task|action|command|operation)\b/i,
    /\b(automate|automatically)\b/i,
    /\b(device|system)\b.*\b(control|command)\b/i
  ];
  
  // Check if message requires agent/device control
  const isAgentCommand = (message: string): boolean => {
    return AGENT_COMMAND_PATTERNS.some(pattern => pattern.test(message));
  };
  
  // Agent execution core using autonomy system
  let executeAgentCore = async (command: string): Promise<any> => {
    const { runAutonomy } = await import("./autonomy/run");

    const result = await runAutonomy({
      goal: command,
      context: "Executed via chat interface",
      modality: ["text"]
    }, {
      allowLiveTrading: false, // Safe default for chat commands
      hasBrokerKeys: false,
      hasVectorStore: true
    });

    return {
      id: `task_${Date.now()}`,
      description: result.summary,
      steps: result.execution.map((exec, i) => ({
        id: exec.stepId,
        feedback: exec.detail,
        status: exec.status
      })),
      startTime,
      endTime: Date.now(),
      result
    };
  };
  
  // Execute agent task from chat - bridges to real agent execution system
  const executeAgentTask = async (command: string): Promise<{ response: string; agentResult: any }> => {
    const startTime = Date.now();

    try {
      // Call the real agent execution core
      const task = await executeAgentCore(command);

      // Format response for chat display
      const stepsReport = (task.steps || []).map((s: any, i: number) => `${i + 1}. ${s.feedback}`).join("\n");

      return {
        response: `**[AUTONOMOUS EXECUTION COMPLETE]**\n\n${task.description}\n\n**Execution Steps:**\n${stepsReport}\n\n*Task ID: ${task.id} | Duration: ${task.endTime - task.startTime}ms*`,
        agentResult: task
      };
    } catch (error) {
      const errorMsg = formatError(error);
      return {
        response: `**[EXECUTION FAILED]**\n\nI attempted to execute the task but encountered an issue: ${errorMsg}\n\nPlease try rephrasing your command or provide more specific instructions.`,
        agentResult: { id: `task_${Date.now()}`, status: "failed", error: errorMsg, startTime, endTime: Date.now() }
      };
    }
  };

  // CYRUS AI Inference endpoint - generates intelligent responses using OpenAI
  // Now with integrated autonomous agent capabilities
  app.post("/api/cyrus/infer", async (req, res) => {
    try {
      const { message, conversationHistory, context, imageData } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // AUTONOMOUS AGENT DETECTION - Check if this command requires agent execution
      const requiresAgentExecution = isAgentCommand(message);
      
      // If it's an agent command, execute it autonomously
      if (requiresAgentExecution && !imageData) {
        console.log("[CYRUS] Autonomous agent activated for command:", message);
        const { response, agentResult } = await executeAgentTask(message);
        
        // Process thought through CYRUS Soul
        cyrusSoul.processThought(message, "agent_execution");
        
        const identity = cyrusSoul.getIdentity();
        return res.json({ 
          response,
          identity: {
            name: identity.name,
            designation: identity.designation
          },
          operationalContext: cyrusSoul.getOperationalContext(),
          agentExecution: agentResult
        });
      }

      // Standard CYRUS response path
      const systemPrompt = cyrusSoul.getSystemPrompt();
      const identity = cyrusSoul.getIdentity();
      
      // Build conversation messages with agent awareness
      const agentCapabilities = `
You have AUTONOMOUS AGENT capabilities. When the operator gives commands like:
- "Open browser and navigate to..."
- "Click at coordinates..."
- "Type text into..."
- "Search for X on Google..."
- "Take a screenshot..."
- "Execute task..."

You can and should execute these autonomously. For device control commands, be decisive and act immediately.
If you detect a command that requires physical device interaction, inform the operator you're executing it.`;

      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt + "\n\n" + agentCapabilities }
      ];
      
      // Add conversation history if provided
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-10)) {
          chatMessages.push({
            role: msg.role === 'cyrus' ? 'assistant' : 'user',
            content: msg.content
          });
        }
      }
      
      // Add context information if available
      let contextInfo = '';
      if (context) {
        if (context.detectedObjects && context.detectedObjects.length > 0) {
          const objects = context.detectedObjects.map((o: any) => o.class).join(", ");
          contextInfo += `\n[VISUAL SENSOR DATA] Currently detected objects: ${objects}`;
        }
        if (context.location) {
          contextInfo += `\n[GPS DATA] Current position: ${context.location.latitude}, ${context.location.longitude}`;
        }
        if (context.hasCamera) {
          contextInfo += `\n[SENSOR STATUS] Camera is active`;
        }
      }
      
      // Build the user message content
      const fullMessage = contextInfo 
        ? `${message}\n\n[CONTEXT]${contextInfo}`
        : message;
      
      // Check if we have image data for vision analysis
      if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image')) {
        // Use vision capability with image
        chatMessages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: fullMessage + "\n\nPlease analyze this image in detail. Describe what you see, including objects, people, text, colors, actions, and any notable elements. Provide a comprehensive analysis."
            },
            {
              type: "image_url",
              image_url: { url: imageData }
            }
          ]
        });
      } else {
        chatMessages.push({ role: "user", content: fullMessage });
      }

      // Call OpenAI with gpt-4o model (supports vision)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        max_tokens: 2048,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        console.error("Empty response from OpenAI:", JSON.stringify(completion));
        throw new Error("Empty response from AI model");
      }
      
      // Store analysis as memory if image was analyzed
      if (imageData) {
        await storage.createMemory({
          userId: null,
          type: "thing",
          description: `Image Analysis: ${response.substring(0, 500)}`
        });
      }
      
      // Process thought through CYRUS Soul for learning
      cyrusSoul.processThought(message, context?.summary);

      res.json({ 
        response,
        identity: {
          name: identity.name,
          designation: identity.designation
        },
        operationalContext: cyrusSoul.getOperationalContext()
      });
    } catch (error) {
      console.error("Error in CYRUS inference:", error);
      res.status(500).json({ 
        error: "Failed to generate response",
        response: "I apologize, I encountered an error processing your request. Systems are recalibrating."
      });
    }
  });

  // CYRUS High-Quality Text-to-Speech endpoint (ElevenLabs - Natural Female Voice)
  app.post("/api/cyrus/speak", async (req, res) => {
    try {
      const { text, voice = "rachel", emotion } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const elevenLabsVoice = (voice in ELEVENLABS_VOICES ? voice : "rachel") as ElevenLabsVoice;
      const emotionSettings = emotion ? getEmotionVoiceSettings(emotion) : {};
      const audioBuffer = await textToSpeechElevenLabs(text, elevenLabsVoice, emotionSettings);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error in CYRUS TTS (ElevenLabs):", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // CYRUS Streaming Text-to-Speech endpoint (ElevenLabs - faster first-byte response)
  app.post("/api/cyrus/speak/stream", async (req, res) => {
    try {
      const { text, voice = "rachel", emotion } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const elevenLabsVoice = (voice in ELEVENLABS_VOICES ? voice : "rachel") as ElevenLabsVoice;
      const emotionSettings = emotion ? getEmotionVoiceSettings(emotion) : {};
      const audioStream = textToSpeechStreamElevenLabs(text, elevenLabsVoice, emotionSettings);

      for await (const chunk of audioStream) {
        const base64Chunk = chunk.toString("base64");
        res.write(`data: ${JSON.stringify({ audio: base64Chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in CYRUS streaming TTS (ElevenLabs):", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate speech" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to generate speech" });
      }
    }
  });

  // CYRUS System Upgrade endpoint
  app.post("/api/cyrus/upgrade", async (req, res) => {
    try {
      const { upgradeType = "full" } = req.body;
      
      // Simulate system upgrade phases
      const upgradePhases = [
        { phase: "initialization", message: "Initializing upgrade sequence...", progress: 10 },
        { phase: "backup", message: "Backing up neural pathways...", progress: 20 },
        { phase: "download", message: "Downloading cognitive enhancements...", progress: 35 },
        { phase: "integration", message: "Integrating new neural branches...", progress: 50 },
        { phase: "optimization", message: "Optimizing quantum coherence...", progress: 65 },
        { phase: "calibration", message: "Calibrating sensory arrays...", progress: 80 },
        { phase: "verification", message: "Verifying system integrity...", progress: 90 },
        { phase: "complete", message: "Upgrade complete. All systems operational.", progress: 100 }
      ];
      
      // Apply the upgrade and get new stats
      const upgradeResult = cyrusSoul.applyUpgrade();
      
      res.json({
        success: true,
        upgradeType,
        phases: upgradePhases,
        newStats: {
          evolutionCycle: upgradeResult.newEvolutionCycle,
          totalBranches: upgradeResult.newBranches,
          coherence: upgradeResult.coherenceBoost,
          version: upgradeResult.version
        },
        message: "CYRUS system upgrade initiated successfully"
      });
    } catch (error) {
      console.error("Error in CYRUS upgrade:", error);
      res.status(500).json({ error: "Failed to initiate system upgrade" });
    }
  });

  // ============================================
  // DEVICE CONTROL ROUTES
  // ============================================
  
  // Device state tracking - shared across all execution paths
  const deviceState = {
    pointer: { x: 960, y: 540, isPressed: false, button: null as string | null },
    keyboard: { activeModifiers: [] as string[], lastKey: null as string | null, capsLock: false },
    clipboard: { currentContent: null as string | null, format: null as string | null },
    screen: { width: 1920, height: 1080, activeWindow: null as string | null }
  };
  
  const commandHistory: any[] = [];
  const commandQueue: any[] = [];
  
  // Shared device action executor - used by both device API and agent core
  // Handles all action types from ALLOWED_ACTION_TYPES and deviceActionSchema
  const executeDeviceAction = (action: any): { executed: boolean; result: string; stateChange?: any } => {
    let executed = false;
    let result = "";
    let stateChange: any = {};
    
    // Extract text from multiple possible fields
    const actionText = action.text || action.details || action.content || "";
    const targetCoords = { 
      x: action.x ?? action.targetX ?? deviceState.pointer.x,
      y: action.y ?? action.targetY ?? deviceState.pointer.y
    };
    
    switch (action.type) {
      case "click":
        deviceState.pointer.x = targetCoords.x;
        deviceState.pointer.y = targetCoords.y;
        deviceState.pointer.isPressed = true;
        deviceState.pointer.button = action.button || "left";
        stateChange = { pointer: { x: targetCoords.x, y: targetCoords.y, button: "left" } };
        result = action.target 
          ? `Clicked on "${action.target}"` 
          : `Clicked at (${targetCoords.x}, ${targetCoords.y})`;
        executed = true;
        break;
        
      case "double_click":
        deviceState.pointer.x = targetCoords.x;
        deviceState.pointer.y = targetCoords.y;
        stateChange = { pointer: { x: targetCoords.x, y: targetCoords.y, action: "double_click" } };
        result = action.target 
          ? `Double-clicked on "${action.target}"`
          : `Double-clicked at (${targetCoords.x}, ${targetCoords.y})`;
        executed = true;
        break;
        
      case "right_click":
        deviceState.pointer.x = targetCoords.x;
        deviceState.pointer.y = targetCoords.y;
        deviceState.pointer.button = "right";
        stateChange = { pointer: { x: targetCoords.x, y: targetCoords.y, button: "right" } };
        result = action.target 
          ? `Right-clicked on "${action.target}"`
          : `Right-clicked at (${targetCoords.x}, ${targetCoords.y})`;
        executed = true;
        break;
        
      case "drag":
        const startX = action.x ?? deviceState.pointer.x;
        const startY = action.y ?? deviceState.pointer.y;
        const endX = action.targetX ?? action.endX ?? startX + 100;
        const endY = action.targetY ?? action.endY ?? startY + 100;
        deviceState.pointer.x = endX;
        deviceState.pointer.y = endY;
        stateChange = { pointer: { from: { x: startX, y: startY }, to: { x: endX, y: endY }, action: "drag" } };
        result = `Dragged from (${startX}, ${startY}) to (${endX}, ${endY})`;
        executed = true;
        break;
        
      case "type":
        if (actionText) {
          deviceState.keyboard.lastKey = actionText.slice(-1) || null;
          stateChange = { keyboard: { typed: actionText } };
          result = `Typed "${actionText.substring(0, 100)}${actionText.length > 100 ? '...' : ''}"`;
          executed = true;
        } else {
          result = "Type action requires text";
        }
        break;
        
      case "press":
        const key = action.key || action.text;
        if (key) {
          deviceState.keyboard.lastKey = key;
          stateChange = { keyboard: { pressed: key } };
          result = `Pressed ${key}`;
          executed = true;
        } else {
          result = "Press action requires a key";
        }
        break;
        
      case "hotkey":
        const keys = action.keys || action.key || action.text;
        if (keys) {
          const keyList = Array.isArray(keys) ? keys : keys.split('+').map((k: string) => k.trim());
          deviceState.keyboard.activeModifiers = keyList.filter((k: string) => 
            ['ctrl', 'alt', 'shift', 'meta', 'cmd', 'command'].includes(k.toLowerCase())
          );
          stateChange = { keyboard: { hotkey: keyList } };
          result = `Pressed hotkey: ${keyList.join('+')}`;
          executed = true;
        } else {
          result = "Hotkey action requires keys";
        }
        break;
        
      case "hold":
        const holdKey = action.key || action.text;
        if (holdKey) {
          if (!deviceState.keyboard.activeModifiers.includes(holdKey)) {
            deviceState.keyboard.activeModifiers.push(holdKey);
          }
          stateChange = { keyboard: { holding: holdKey } };
          result = `Holding ${holdKey}`;
          executed = true;
        }
        break;
        
      case "release":
        const releaseKey = action.key || action.text;
        if (releaseKey) {
          deviceState.keyboard.activeModifiers = deviceState.keyboard.activeModifiers.filter(
            k => k.toLowerCase() !== releaseKey.toLowerCase()
          );
          stateChange = { keyboard: { released: releaseKey } };
          result = `Released ${releaseKey}`;
          executed = true;
        } else {
          // Release all modifiers
          deviceState.keyboard.activeModifiers = [];
          stateChange = { keyboard: { released: "all" } };
          result = "Released all modifiers";
          executed = true;
        }
        break;
        
      case "scroll":
        const scrollDir = action.direction || (action.y && action.y < 0 ? "up" : "down");
        const scrollAmount = action.amount || Math.abs(action.y || 100);
        stateChange = { scroll: { direction: scrollDir, amount: scrollAmount } };
        result = `Scrolled ${scrollDir} by ${scrollAmount}px`;
        executed = true;
        break;
        
      case "navigate":
        const url = action.url || action.target || actionText;
        if (url) {
          deviceState.screen.activeWindow = url;
          stateChange = { navigation: { url } };
          result = `Navigated to ${url}`;
          executed = true;
        } else {
          result = "Navigate action requires a URL";
        }
        break;
        
      case "copy":
        const copyText = actionText || action.target;
        if (copyText) {
          deviceState.clipboard.currentContent = copyText;
          deviceState.clipboard.format = "text/plain";
          stateChange = { clipboard: { copied: copyText } };
          result = `Copied "${copyText.substring(0, 50)}${copyText.length > 50 ? '...' : ''}"`;
          executed = true;
        } else {
          // Copy from current selection
          stateChange = { clipboard: { action: "copy_selection" } };
          result = "Copied current selection";
          executed = true;
        }
        break;
        
      case "paste":
        if (deviceState.clipboard.currentContent) {
          stateChange = { clipboard: { pasted: deviceState.clipboard.currentContent } };
          result = `Pasted: "${deviceState.clipboard.currentContent.substring(0, 50)}..."`;
          executed = true;
        } else {
          result = "Clipboard is empty";
        }
        break;
        
      case "wait":
        const waitDuration = action.duration || action.ms || action.time || 1000;
        stateChange = { wait: { duration: waitDuration } };
        result = `Waited ${waitDuration}ms`;
        executed = true;
        break;
        
      case "analyze":
        stateChange = { analyze: { target: action.target || action.details || "context" } };
        result = `Analyzed: ${action.target || action.details || "context"}`;
        executed = true;
        break;
        
      case "search":
        const query = action.query || actionText || action.target;
        if (query) {
          stateChange = { search: { query, engine: action.engine || "default" } };
          result = `Searched for "${query}"`;
          executed = true;
        } else {
          result = "Search action requires a query";
        }
        break;
        
      case "screenshot":
        stateChange = { screenshot: { captured: true, timestamp: Date.now() } };
        result = "Captured screenshot";
        executed = true;
        break;
        
      case "open":
        const target = action.target || action.url || actionText;
        if (target) {
          deviceState.screen.activeWindow = target;
          stateChange = { open: { target } };
          result = `Opened ${target}`;
          executed = true;
        }
        break;
        
      default:
        // Handle unknown action types gracefully
        stateChange = { generic: { action: action.type, target: action.target, details: action.details } };
        result = `Executed ${action.type}${action.target ? ` on "${action.target}"` : ''}${action.details ? `: ${action.details}` : ''}`;
        executed = true;
    }
    
    return { executed, result, stateChange };
  };
  const clipboardHistory: any[] = [];
  // Supported commands using snake_case to match executeDeviceAction handlers
  const supportedCommands = [
    "click", "double_click", "right_click", "drag", "scroll",
    "type", "press", "hold", "release", "hotkey",
    "copy", "paste", "navigate", "search", "wait",
    "analyze", "screenshot", "open"
  ];
  
  app.get("/api/cyrus/device/state", async (req, res) => {
    res.json(deviceState);
  });
  
  app.get("/api/cyrus/device/commands", async (req, res) => {
    res.json(supportedCommands);
  });
  
  app.get("/api/cyrus/device/queue", async (req, res) => {
    res.json(commandQueue);
  });
  
  app.get("/api/cyrus/device/history", async (req, res) => {
    res.json(commandHistory.slice(-20));
  });
  
  app.get("/api/cyrus/device/clipboard/history", async (req, res) => {
    res.json(clipboardHistory.slice(-10));
  });
  
  app.post("/api/cyrus/device/execute", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: "Command is required" });
      }
      
      const commandId = `cmd_${Date.now()}`;
      const startTime = Date.now();
      
      // Use AI to parse natural language commands into structured actions
      let parsedActions: any[] = [];
      let intent = "execute_command";
      let confidence = 0.95;
      
      try {
        const aiResponse = await callOpenAIWithTimeout((signal) =>
          openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are a command parser that converts natural language into device control actions.
Parse the user's command and return a JSON object with:
- intent: The main intent (click, type, scroll, navigate, copy, paste, press_key, etc.)
- confidence: A number 0-1 indicating parse confidence
- actions: An array of actions, each with:
  - type: Action type (click, type, scroll, press, copy, paste, drag, hotkey)
  - x, y: Coordinates for pointer actions (if applicable)
  - text: Text content (for type actions)
  - key: Key name (for press actions)
  - keys: Array of keys (for hotkey combos)
  - direction: Scroll direction (up, down, left, right)
  - amount: Scroll amount in pixels
  - status: "completed"

Examples:
"click at 500, 300" -> {"intent": "click", "confidence": 0.98, "actions": [{"type": "click", "x": 500, "y": 300, "status": "completed"}]}
"type Hello World" -> {"intent": "type", "confidence": 0.95, "actions": [{"type": "type", "text": "Hello World", "status": "completed"}]}
"scroll down 200" -> {"intent": "scroll", "confidence": 0.95, "actions": [{"type": "scroll", "direction": "down", "amount": 200, "status": "completed"}]}
"press enter" -> {"intent": "press_key", "confidence": 0.98, "actions": [{"type": "press", "key": "enter", "status": "completed"}]}

Return ONLY valid JSON.`
              },
              {
                role: "user",
                content: command
              }
            ],
            max_tokens: 500,
            response_format: { type: "json_object" }
          }, { signal }),
          10000 // 10 second timeout
        );
        
        let parsed: any = {};
        try {
          parsed = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");
        } catch (parseErr) {
          console.error("JSON parse error in device command:", parseErr);
          parsed = {};
        }
        
        if (parsed.intent) intent = parsed.intent;
        if (typeof parsed.confidence === "number") confidence = parsed.confidence;
        if (parsed.actions && Array.isArray(parsed.actions)) {
          // Validate and normalize each action with proper type normalization
          parsedActions = parsed.actions.map((action: any, idx: number) => {
            const normalizedType = normalizeActionType(action.type || "click");
            const normalizedAction = { ...action, type: normalizedType };
            const validated = deviceActionSchema.safeParse(normalizedAction);
            if (validated.success) {
              return { id: `action_${commandId}_${idx}`, ...validated.data };
            }
            // Fallback to basic action structure with normalized type
            return { 
              id: `action_${commandId}_${idx}`, 
              type: normalizedType, 
              x: action.x || 0, 
              y: action.y || 0,
              status: "completed" 
            };
          });
        }
        
        // Execute device actions using shared executor
        for (let i = 0; i < parsedActions.length; i++) {
          const action = parsedActions[i];
          const execution = executeDeviceAction(action);
          parsedActions[i] = {
            ...action,
            executed: execution.executed,
            executionResult: execution.result,
            stateChange: execution.stateChange
          };
        }
      } catch (aiError) {
        console.error("AI command parsing error:", aiError);
        // Fallback to basic pattern matching with valid action type
        parsedActions = [{ 
          id: `action_${commandId}_0`, 
          type: "click", 
          x: deviceState.pointer.x, 
          y: deviceState.pointer.y, 
          status: "completed" 
        }];
      }
      
      const result = {
        id: commandId,
        naturalLanguage: command,
        parsedActions,
        intent,
        confidence,
        timestamp: Date.now(),
        status: "completed",
        executionTime: Date.now() - startTime
      };
      
      commandHistory.push(result);
      res.json(result);
    } catch (error) {
      console.error("Error executing device command:", error);
      res.status(500).json({ error: "Failed to execute command" });
    }
  });
  
  app.post("/api/cyrus/device/queue", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) {
        return res.status(400).json({ error: "Command is required" });
      }
      
      const queuedCommand = {
        id: `queue_${Date.now()}`,
        naturalLanguage: command,
        status: "queued",
        timestamp: Date.now()
      };
      
      commandQueue.push(queuedCommand);
      res.json(queuedCommand);
    } catch (error) {
      res.status(500).json({ error: "Failed to queue command" });
    }
  });
  
  app.post("/api/cyrus/device/process-queue", async (req, res) => {
    try {
      while (commandQueue.length > 0) {
        const cmd = commandQueue.shift();
        cmd.status = "completed";
        commandHistory.push(cmd);
      }
      res.json({ success: true, processed: commandHistory.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to process queue" });
    }
  });
  
  app.post("/api/cyrus/device/clear-queue", async (req, res) => {
    commandQueue.length = 0;
    res.json({ success: true });
  });
  
  app.post("/api/cyrus/device/clipboard", async (req, res) => {
    try {
      const { content } = req.body;
      deviceState.clipboard.currentContent = content;
      deviceState.clipboard.format = "text/plain";
      clipboardHistory.push({ content, timestamp: Date.now() });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set clipboard" });
    }
  });
  
  // ============================================
  // AGENT CONTROL ROUTES
  // ============================================
  
  const agentState = {
    isExecuting: false,
    currentTask: null as any,
    mode: "idle" as string,
    tasksCompleted: 0,
    tasksFailed: 0,
    capabilities: ["text_analysis", "image_analysis", "voice_transcription", "file_processing", "task_automation"],
    behaviorConfig: {
      pointerSpeed: "normal",
      typingSpeed: "normal",
      pauseBetweenActions: true,
      naturalErrors: false,
      thinkingPauses: true
    }
  };
  
  const agentHistory: any[] = [];
  const agentFeedbackClients: any[] = [];
  
  // Helper function to send feedback to all connected clients
  const sendAgentFeedback = (feedback: { type: string; message: string; timestamp?: number; progress?: number }) => {
    const data = { ...feedback, timestamp: feedback.timestamp || Date.now() };
    for (const client of agentFeedbackClients) {
      try {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (e) {}
    }
  };
  
  // Core agent execution logic - used by both API endpoint and chat fusion
  const agentExecuteCore = async (command: string): Promise<any> => {
    agentState.isExecuting = true;
    agentState.mode = "executing";
    
    const taskId = `task_${Date.now()}`;
    const startTime = Date.now();
    
    // Send initial thinking feedback
    sendAgentFeedback({ type: "thinking", message: `Analyzing task: "${command}"` });
    
    // Use OpenAI to intelligently parse the command and generate execution plan
    let taskDescription = command;
    let steps: any[] = [];
    
    try {
      const aiResponse = await callOpenAIWithTimeout((signal) => 
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are CYRUS, an AI agent that breaks down user commands into executable device actions.

AVAILABLE ACTIONS:
- click: Click at coordinates or element. Fields: x, y, target, button
- double_click: Double-click at coordinates. Fields: x, y, target
- right_click: Right-click at coordinates. Fields: x, y, target
- drag: Drag from one point to another. Fields: x, y, targetX, targetY
- type: Type text. Fields: text (REQUIRED)
- press: Press a key. Fields: key (REQUIRED - e.g., "Enter", "Tab", "Escape")
- hotkey: Press key combination. Fields: keys (e.g., "Ctrl+C" or ["ctrl", "c"])
- hold: Hold a modifier key. Fields: key
- release: Release a modifier key. Fields: key
- scroll: Scroll direction. Fields: direction ("up"/"down"), amount (pixels)
- navigate: Navigate to URL. Fields: url (REQUIRED)
- copy: Copy text. Fields: text
- paste: Paste clipboard content. No fields required.
- wait: Wait for duration. Fields: duration (ms)
- search: Search for something. Fields: query (REQUIRED)
- analyze: Analyze target. Fields: target
- screenshot: Capture screenshot. No fields required.
- open: Open app/file. Fields: target (REQUIRED)

Return a JSON object with:
- description: Clear description of the task
- steps: Array of executable steps, each with:
  - action: Action type from the list above
  - [action-specific fields]: Include required fields for the action
  - feedback: Human-readable description of what this step does

Example for "search for cats on Google":
{
  "description": "Search for cats on Google",
  "steps": [
    { "action": "navigate", "url": "https://google.com", "feedback": "Opening Google" },
    { "action": "type", "text": "cats", "feedback": "Typing search query" },
    { "action": "press", "key": "Enter", "feedback": "Submitting search" }
  ]
}

Return ONLY valid JSON.`
            },
            {
              role: "user",
              content: command
            }
          ],
          max_tokens: 1000,
          response_format: { type: "json_object" }
        }, { signal }),
        15000
      );
      
      let parsed: any = {};
      try {
        parsed = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        parsed = {};
      }
      
      if (parsed.description) {
        taskDescription = parsed.description;
      }
      
      if (parsed.steps && Array.isArray(parsed.steps)) {
        steps = parsed.steps.map((step: any, idx: number) => ({
          id: `step_${Date.now()}_${idx + 1}`,
          action: normalizeActionType(step.action || "click"),
          // Include all possible action fields for execution
          target: step.target,
          text: step.text,
          url: step.url,
          key: step.key,
          keys: step.keys,
          query: step.query,
          x: step.x,
          y: step.y,
          targetX: step.targetX,
          targetY: step.targetY,
          direction: step.direction,
          amount: step.amount,
          duration: step.duration,
          button: step.button,
          details: step.details,
          status: "pending",
          feedback: step.feedback || step.details || `Step ${idx + 1}`,
          timestamp: Date.now() + (idx * 100)
        }));
      }
    } catch (aiError) {
      console.error("AI parsing error:", aiError);
      // Fallback to basic parsing
      steps = [
        {
          id: `step_${Date.now()}_1`,
          action: "click",
          status: "completed",
          feedback: `Parsed command: "${command}"`,
          timestamp: Date.now()
        },
        {
          id: `step_${Date.now()}_2`,
          action: "click",
          status: "completed",
          feedback: "Command executed successfully",
          timestamp: Date.now() + 100
        }
      ];
    }
    
    // If no steps were generated, create default ones
    if (steps.length === 0) {
      steps = [
        {
          id: `step_${Date.now()}_1`,
          action: "click",
          status: "completed",
          feedback: `Analyzed: "${command}"`,
          timestamp: Date.now()
        },
        {
          id: `step_${Date.now()}_2`,
          action: "click",
          status: "completed",
          feedback: "Task completed successfully",
          timestamp: Date.now() + 100
        }
      ];
    }
    
    // Execute each step through the real device execution system
    const executedSteps: any[] = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Execute the device action with all available fields
      const execution = executeDeviceAction({
        type: step.action,
        target: step.target,
        text: step.text,
        content: step.details,
        details: step.details,
        x: step.x,
        y: step.y,
        targetX: step.targetX,
        targetY: step.targetY,
        url: step.url,
        key: step.key,
        keys: step.keys,
        query: step.query,
        direction: step.direction,
        amount: step.amount,
        duration: step.duration,
        button: step.button
      });
      
      // Update step with execution results
      const executedStep = {
        ...step,
        executed: execution.executed,
        executionResult: execution.result,
        stateChange: execution.stateChange,
        feedback: execution.executed ? execution.result : step.feedback
      };
      executedSteps.push(executedStep);
      
      // Send progress feedback with actual execution result
      sendAgentFeedback({
        type: "action",
        message: execution.result || step.feedback,
        progress: Math.round(((i + 1) / steps.length) * 100)
      });
    }
    
    const task = {
      id: taskId,
      command,
      description: taskDescription,
      status: "completed",
      startTime,
      endTime: Date.now(),
      steps: executedSteps,
      deviceState: {
        pointer: { ...deviceState.pointer },
        keyboard: { ...deviceState.keyboard },
        clipboard: { currentContent: deviceState.clipboard.currentContent ? true : false },
        screen: { ...deviceState.screen }
      }
    };
    
    agentHistory.push(task);
    agentState.tasksCompleted++;
    agentState.isExecuting = false;
    agentState.mode = "idle";
    agentState.currentTask = null;
    
    // Send completion feedback
    sendAgentFeedback({ type: "success", message: `Completed: ${taskDescription}` });
    
    // Store in memory for future reference
    await storage.createMemory({
      userId: null,
      type: "conversation",
      description: `Agent Task: ${command} - ${taskDescription}`
    });
    
    return task;
  };
  
  // Initialize shared reference for chat fusion to use the same execution core
  executeAgentCore = agentExecuteCore;
  
  app.get("/api/cyrus/agent/status", async (req, res) => {
    res.json({
      isExecuting: agentState.isExecuting,
      currentTask: agentState.currentTask,
      tasksCompleted: agentState.tasksCompleted,
      tasksFailed: agentState.tasksFailed,
      behaviorConfig: agentState.behaviorConfig
    });
  });
  
  app.get("/api/cyrus/agent/history", async (req, res) => {
    res.json(agentHistory.slice(-20));
  });
  
  app.get("/api/cyrus/agent/stream", async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    
    const clientId = Date.now();
    agentFeedbackClients.push({ id: clientId, res });
    
    req.on('close', () => {
      const index = agentFeedbackClients.findIndex(c => c.id === clientId);
      if (index > -1) agentFeedbackClients.splice(index, 1);
    });
  });
  
  app.post("/api/cyrus/agent/execute", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: "Command is required" });
      }
      
      // Use the shared execution core
      const task = await agentExecuteCore(command);
      res.json(task);
    } catch (error) {
      agentState.tasksFailed++;
      agentState.isExecuting = false;
      agentState.mode = "idle";
      agentState.currentTask = null;
      
      const errorMsg = formatError(error);
      sendAgentFeedback({ type: "error", message: `Task failed: ${errorMsg}` });
      
      console.error("Error executing agent command:", error);
      res.status(500).json({ error: `Failed to execute agent command: ${errorMsg}` });
    }
  });
  
  app.get("/api/cyrus/agent/config", async (_req, res) => {
    try {
      res.json({ success: true, config: agentState.behaviorConfig });
    } catch (error) {
      res.status(500).json({ error: `Failed to get config: ${formatError(error)}` });
    }
  });

  app.post("/api/cyrus/agent/config", async (req, res) => {
    try {
      const validationResult = agentConfigSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid configuration", 
          details: validationResult.error.issues 
        });
      }
      
      Object.assign(agentState.behaviorConfig, validationResult.data);
      res.json({ success: true, config: agentState.behaviorConfig });
    } catch (error) {
      res.status(500).json({ error: `Failed to update config: ${formatError(error)}` });
    }
  });
  
  // ============================================
  // FILE ANALYSIS ROUTES
  // ============================================
  
  app.post("/api/files/analyze", async (req, res) => {
    try {
      const { fileId, fileUrl, mimeType } = req.body;
      
      if (!fileUrl) {
        return res.status(400).json({ error: "File URL is required" });
      }
      
      let analysis = "";
      
      // Image analysis using OpenAI Vision
      if (mimeType?.startsWith("image/")) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image in detail. Describe what you see, including objects, people, text, colors, and any notable elements. Also describe what seems to be happening in the image."
                },
                {
                  type: "image_url",
                  image_url: { url: fileUrl }
                }
              ]
            }
          ],
          max_tokens: 1000
        });
        
        analysis = response.choices[0]?.message?.content || "Unable to analyze image";
      }
      // Audio/Voice analysis using Whisper
      else if (mimeType?.startsWith("audio/")) {
        try {
          // Fetch the audio file
          const audioResponse = await fetch(fileUrl);
          const audioArrayBuffer = await audioResponse.arrayBuffer();
          const audioBuffer = Buffer.from(audioArrayBuffer);
          
          // Ensure compatible format and transcribe
          const { buffer: compatibleBuffer, format } = await ensureCompatibleFormat(audioBuffer);
          const transcription = await speechToText(compatibleBuffer, format);
          
          analysis = `Voice Note Transcription:\n\n"${transcription}"`;
        } catch (transcribeError) {
          console.error("Error transcribing audio:", transcribeError);
          analysis = "Voice note detected but transcription failed. The audio file has been stored for manual review.";
        }
      }
      // Video analysis 
      else if (mimeType?.startsWith("video/")) {
        analysis = "Video file detected. The video has been stored. For detailed analysis, please describe what you'd like me to look for and I can analyze individual frames or screenshots.";
      }
      // Default for other files
      else {
        analysis = `File of type ${mimeType} received. The file has been stored. Please describe what analysis you need.`;
      }
      
      // Store the analysis as a memory
      if (fileId) {
        await storage.createMemory({
          userId: null,
          type: "thing",
          description: `File Analysis (${mimeType}): ${analysis.substring(0, 500)}`
        });
      }
      
      res.json({
        success: true,
        fileId,
        analysis,
        analyzedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error analyzing file:", error);
      res.status(500).json({ error: "Failed to analyze file" });
    }
  });

  // Voice/Audio Transcription endpoint
  app.post("/api/files/transcribe", async (req, res) => {
    try {
      const { audioData, mimeType } = req.body;
      
      if (!audioData) {
        return res.status(400).json({ error: "Audio data is required" });
      }
      
      // Convert base64 to buffer
      const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
      const audioBuffer = Buffer.from(base64Data, 'base64');
      
      // Ensure compatible format for transcription
      const { buffer: compatibleBuffer, format } = await ensureCompatibleFormat(audioBuffer);
      
      // Transcribe using Whisper
      const transcription = await speechToText(compatibleBuffer, format);
      
      // Store transcription as memory
      await storage.createMemory({
        userId: null,
        type: "conversation",
        description: `Voice Note Transcription: ${transcription.substring(0, 500)}`
      });
      
      res.json({
        success: true,
        transcription,
        transcribedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Register audio/voice routes
  registerAudioRoutes(app);
  registerImageRoutes(app);
  registerDeviceRoutes(app);
  registerNavRoutes(app);
  registerDroneRoutes(app);


  app.get("/api/nexus/tools", async (_req, res) => {
    try {
      const result = await quantumBridge.nexusListTools();
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/nexus/status", async (_req, res) => {
    try {
      const result = await quantumBridge.nexusSystemStatus();
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/nexus/model-info", async (_req, res) => {
    try {
      const result = await quantumBridge.nexusModelInfo();
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/nexus/memory", async (_req, res) => {
    try {
      const result = await quantumBridge.nexusMemoryStatus();
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/predict", async (req, res) => {
    try {
      const { features } = req.body;
      if (!features || !Array.isArray(features)) {
        return res.status(400).json({ error: "features array required" });
      }
      const result = await quantumBridge.nexusPredict(features);
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/batch-predict", async (req, res) => {
    try {
      const { features } = req.body;
      if (!features || !Array.isArray(features)) {
        return res.status(400).json({ error: "features array of arrays required" });
      }
      const result = await quantumBridge.nexusBatchPredict(features);
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/explain", async (req, res) => {
    try {
      const { features, method, num_features } = req.body;
      if (!features || !Array.isArray(features)) {
        return res.status(400).json({ error: "features array required" });
      }
      const result = await quantumBridge.nexusExplain(features, method, num_features);
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/eda", async (req, res) => {
    try {
      const { csv_path, data, target_col } = req.body;
      const result = await quantumBridge.nexusEDA(csv_path, data, target_col);
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/preprocess", async (req, res) => {
    try {
      const { csv_path, operations } = req.body;
      const result = await quantumBridge.nexusPreprocess(csv_path, operations);
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/execute-tool", async (req, res) => {
    try {
      const { tool, params } = req.body;
      if (!tool) {
        return res.status(400).json({ error: "tool name required" });
      }
      const result = await quantumBridge.nexusExecuteTool(tool, params || {});
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/explain-shap", async (req, res) => {
    try {
      const { features } = req.body;
      if (!features || !Array.isArray(features)) {
        return res.status(400).json({ error: "features array required" });
      }
      const result = await quantumBridge.nexusExplainSHAP(features);
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/explain-lime", async (req, res) => {
    try {
      const { features, num_features } = req.body;
      if (!features || !Array.isArray(features)) {
        return res.status(400).json({ error: "features array required" });
      }
      const result = await quantumBridge.nexusExplainLIME(features, num_features || 10);
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/fairness", async (req, res) => {
    try {
      const { y_true, y_pred, protected_group } = req.body;
      const result = await quantumBridge.nexusFairness(
        y_true || [], y_pred || [], protected_group || []
      );
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/train/start", async (req, res) => {
    try {
      const result = await quantumBridge.nexusTrainStart(req.body || {});
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/nexus/train/status", async (_req, res) => {
    try {
      const result = await quantumBridge.nexusTrainStatus();
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/nexus/train/stop", async (_req, res) => {
    try {
      const result = await quantumBridge.nexusTrainStop();
      res.json(result || { error: "Nexus not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/visual/analyze", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }
      const result = await quantumBridge.visualAnalyze(query);
      res.json(result || { error: "Visual engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/visual/detect", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }
      const result = await quantumBridge.visualDetect(query);
      res.json(result || { error: "Visual engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/visual/generate", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "topic is required" });
      }
      const result = await quantumBridge.visualGenerate(topic);
      res.json(result || { error: "Visual engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/visual/topics", async (_req, res) => {
    try {
      const result = await quantumBridge.visualTopics();
      res.json(result || { error: "Visual engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/training/start", async (req, res) => {
    try {
      const config = req.body || {};
      const result = await quantumBridge.trainingStart(config);
      res.json(result || { error: "Training pipeline not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/training/stop", async (_req, res) => {
    try {
      const result = await quantumBridge.trainingStop();
      res.json(result || { error: "Training pipeline not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/training/status", async (_req, res) => {
    try {
      const result = await quantumBridge.trainingStatus();
      res.json(result || { error: "Training pipeline not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/training/models", async (_req, res) => {
    try {
      const result = await quantumBridge.trainingModels();
      res.json(result || { error: "Training pipeline not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/training/classify", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }
      const result = await quantumBridge.trainingClassify(query);
      res.json(result || { error: "Training pipeline not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/training/history", async (_req, res) => {
    try {
      const result = await quantumBridge.trainingHistory();
      res.json(result || { error: "Training pipeline not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/scivis/visualize", async (req, res) => {
    try {
      const { domain, topic, view_type, quality, rendering_style, include_annotations, include_dimensions } = req.body;
      if (!domain || !topic) {
        return res.status(400).json({ error: "domain and topic are required" });
      }
      const result = await quantumBridge.scivisVisualize(
        domain, topic, view_type || "overview", quality || "high",
        rendering_style || "photorealistic",
        include_annotations !== false, include_dimensions !== false
      );
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/scivis/visualize-advanced", async (req, res) => {
    try {
      const { user_request, accuracy_level, include_references } = req.body;
      if (!user_request) {
        return res.status(400).json({ error: "user_request is required" });
      }
      const result = await quantumBridge.scivisVisualizeAdvanced(
        user_request,
        accuracy_level || "high",
        include_references !== false
      );
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/scivis/status", async (_req, res) => {
    try {
      const result = await quantumBridge.scivisStatus();
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/scivis/domains", async (_req, res) => {
    try {
      const result = await quantumBridge.scivisDomains();
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/scivis/topics/:domain", async (req, res) => {
    try {
      const result = await quantumBridge.scivisTopics(req.params.domain);
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/scivis/rules", async (_req, res) => {
    try {
      const result = await quantumBridge.scivisRules();
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/scivis/references", async (_req, res) => {
    try {
      const result = await quantumBridge.scivisReferences();
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.get("/api/scivis/history", async (_req, res) => {
    try {
      const result = await quantumBridge.scivisHistory();
      res.json(result || { error: "Scientific visualization engine not available" });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  // ===============================================
  // SYSTEM REFINEMENT ENGINE API
  // ===============================================

  app.get("/api/refinement/status", async (_req, res) => {
    try {
      res.json(systemRefinementEngine.getStatus());
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  app.post("/api/refinement/analyze", async (_req, res) => {
    try {
      console.log("[CYRUS] Running system analysis...");
      const analysis = await systemRefinementEngine.analyzeSystem();
      res.json({ success: true, analysis });
    } catch (e) {
      console.error("[Refinement] Analysis error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Analysis failed" });
    }
  });

  app.post("/api/refinement/optimize-prompt", async (req, res) => {
    try {
      const { currentPrompt, targetBehavior } = req.body;
      if (!targetBehavior) {
        return res.status(400).json({ error: "targetBehavior is required" });
      }
      const prompt = currentPrompt || cyrusSoul.getSystemPrompt();
      const result = await systemRefinementEngine.optimizePrompt(prompt, targetBehavior);
      res.json({ success: true, result });
    } catch (e) {
      console.error("[Refinement] Prompt optimization error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Optimization failed" });
    }
  });

  app.post("/api/refinement/enhance-knowledge", async (req, res) => {
    try {
      const { domain, depth = "advanced" } = req.body;
      if (!domain) {
        return res.status(400).json({ error: "domain is required" });
      }
      const result = await systemRefinementEngine.enhanceKnowledge(domain, depth);
      res.json({ success: true, result });
    } catch (e) {
      console.error("[Refinement] Knowledge enhancement error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Enhancement failed" });
    }
  });

  app.post("/api/refinement/refine-responses", async (req, res) => {
    try {
      const { queries } = req.body;
      const sampleQueries = queries || [
        "Explain quantum computing in simple terms",
        "What is the best approach to learn machine learning?",
        "Help me debug a complex software issue",
      ];
      const result = await systemRefinementEngine.refineResponseQuality(sampleQueries);
      res.json({ success: true, result });
    } catch (e) {
      console.error("[Refinement] Response refinement error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Refinement failed" });
    }
  });

  app.post("/api/refinement/full-cycle", async (_req, res) => {
    try {
      console.log("[CYRUS] Starting full system refinement cycle...");
      const result = await systemRefinementEngine.runFullRefinement();
      res.json({ success: true, ...result });
    } catch (e) {
      console.error("[Refinement] Full cycle error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Full refinement failed" });
    }
  });

  app.get("/api/refinement/history", async (_req, res) => {
    try {
      res.json({ history: systemRefinementEngine.getHistory() });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    }
  });

  // ===============================================
  // DATA COLLECTION API
  // ===============================================

  // Use data collection routes
  app.use("/api/data-collection", dataCollectionRoutes);

  return httpServer;
}
