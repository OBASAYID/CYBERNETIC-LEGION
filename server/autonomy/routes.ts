import { Router } from "express";
import { runAutonomy } from "./run.js";
import { AutonomyReport, IntentInput } from "./types.js";
import { memoryService } from "../intelligence/memory-service.js";

const router = Router();

// Autonomy execution endpoint
router.post("/execute", async (req, res) => {
  try {
    const reqAny = req as any;
    const { goal, context, modality }: IntentInput = req.body;

    if (!goal) {
      return res.status(400).json({
        error: "Missing required field: goal"
      });
    }

    const input: IntentInput = {
      goal,
      context,
      modality: modality || ["text"]
    };

    const report: AutonomyReport = await runAutonomy(input, {
      allowLiveTrading: req.body.allowLiveTrading || false,
      hasBrokerKeys: req.body.hasBrokerKeys || false,
      hasVectorStore: req.body.hasVectorStore || false,
      device: req.body.device
    });

    await memoryService.recordDecision({
      userId: reqAny.user?.claims?.sub ?? reqAny.session?.user?.id ?? null,
      source: "autonomy",
      decisionType: "execution_plan",
      input: JSON.stringify(input),
      output: JSON.stringify(report),
      confidence: 95,
      metadata: {
        allowLiveTrading: req.body.allowLiveTrading || false,
        hasBrokerKeys: req.body.hasBrokerKeys || false,
        hasVectorStore: req.body.hasVectorStore || false,
      },
    });

    await memoryService.recordMissionLog({
      missionId: `autonomy_${Date.now()}`,
      userId: reqAny.user?.claims?.sub ?? reqAny.session?.user?.id ?? null,
      status: "completed",
      summary: input.goal,
      details: report as unknown as Record<string, unknown>,
    });

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error("[Autonomy] Execution error:", error);
    res.status(500).json({
      error: "Autonomy execution failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get autonomy status
router.get("/status", async (req, res) => {
  res.json({
    status: "active",
    capabilities: [
      "intent_interpretation",
      "plan_decomposition",
      "tool_selection",
      "plan_execution",
      "result_verification",
      "report_generation"
    ],
    supported_domains: [
      "trading",
      "device_control",
      "data_analysis",
      "content_creation",
      "research",
      "automation"
    ]
  });
});

// Get available tools
router.get("/tools", async (req, res) => {
  res.json({
    tools: [
      {
        name: "web_scraper",
        description: "Collect data from web sources",
        capabilities: ["html_parsing", "data_extraction", "content_analysis"]
      },
      {
        name: "data_analyzer",
        description: "Analyze collected data",
        capabilities: ["statistical_analysis", "pattern_recognition", "insight_generation"]
      },
      {
        name: "content_generator",
        description: "Generate content from data",
        capabilities: ["report_generation", "summary_creation", "insight_synthesis"]
      },
      {
        name: "device_controller",
        description: "Control connected devices",
        capabilities: ["command_execution", "status_monitoring", "automation"]
      },
      {
        name: "trading_engine",
        description: "Execute trading operations",
        capabilities: ["market_analysis", "trade_execution", "risk_management"]
      }
    ]
  });
});

export default router;