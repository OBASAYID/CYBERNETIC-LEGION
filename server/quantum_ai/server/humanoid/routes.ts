import { Router, Request, Response } from "express";
import { presenterMode } from "./presenter-mode";
import { conversationEngine } from "./conversation-engine";

const router = Router();

router.post("/presenter/create", async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    const presentation = await presenterMode.createPresentation(title, content);
    res.json({ success: true, presentation });
  } catch (error: any) {
    console.error("[Presenter] Create error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/presenter/start/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = await presenterMode.startPresentation(id);
    res.json(result);
  } catch (error: any) {
    console.error("[Presenter] Start error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/presenter/next", async (req: Request, res: Response) => {
  try {
    const result = await presenterMode.nextSlide();
    res.json(result);
  } catch (error: any) {
    console.error("[Presenter] Next slide error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/presenter/previous", async (req: Request, res: Response) => {
  try {
    const narration = await presenterMode.previousSlide();
    res.json({ success: true, narration });
  } catch (error: any) {
    console.error("[Presenter] Previous slide error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/presenter/current", async (req: Request, res: Response) => {
  try {
    const narration = await presenterMode.getCurrentSlideNarration();
    const status = presenterMode.getStatus();
    res.json({ ...status, narration });
  } catch (error: any) {
    console.error("[Presenter] Current slide error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/presenter/question", async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }
    const answer = await presenterMode.handleAudienceQuestion(question);
    res.json({ success: true, answer });
  } catch (error: any) {
    console.error("[Presenter] Question error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/presenter/end", async (req: Request, res: Response) => {
  try {
    const farewell = await presenterMode.endPresentation();
    res.json({ success: true, farewell });
  } catch (error: any) {
    console.error("[Presenter] End error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/presenter/status", (req: Request, res: Response) => {
  const status = presenterMode.getStatus();
  res.json(status);
});

router.get("/presenter/all", (req: Request, res: Response) => {
  const presentations = presenterMode.getAllPresentations();
  res.json({ presentations });
});

router.post("/conversation/turn", async (req: Request, res: Response) => {
  try {
    const { message, voiceFeatures, facialData } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const result = await conversationEngine.processConversationTurn(message, voiceFeatures, facialData);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[Conversation] Turn error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/conversation/greeting", async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    const greeting = await conversationEngine.generateProfessionalGreeting(context);
    res.json({ success: true, greeting });
  } catch (error: any) {
    console.error("[Conversation] Greeting error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/conversation/farewell", async (req: Request, res: Response) => {
  try {
    const farewell = await conversationEngine.generateProfessionalFarewell();
    res.json({ success: true, farewell });
  } catch (error: any) {
    console.error("[Conversation] Farewell error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/conversation/transition", async (req: Request, res: Response) => {
  try {
    const { fromTopic, toTopic } = req.body;
    if (!fromTopic || !toTopic) {
      return res.status(400).json({ error: "Both topics are required" });
    }
    const transition = await conversationEngine.generateNaturalTransition(fromTopic, toTopic);
    res.json({ success: true, transition });
  } catch (error: any) {
    console.error("[Conversation] Transition error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/conversation/interruption", async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    const validTypes = ["question", "clarification", "topic_change"];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: "Valid interruption type required" });
    }
    const response = await conversationEngine.handleInterruption(type);
    res.json({ success: true, response });
  } catch (error: any) {
    console.error("[Conversation] Interruption error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/conversation/state", (req: Request, res: Response) => {
  const state = conversationEngine.getConversationState();
  res.json({ success: true, state });
});

router.post("/conversation/clear", (req: Request, res: Response) => {
  conversationEngine.clearConversation();
  res.json({ success: true, message: "Conversation cleared" });
});

router.post("/conversation/set-name", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  conversationEngine.setUserName(name);
  res.json({ success: true, message: `Name set to ${name}` });
});

export default router;

console.log("[Humanoid Routes] API endpoints registered");
