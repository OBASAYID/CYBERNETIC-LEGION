/**
 * Routes the cyrus-ui shell expects even when CYRUS_COMMS_ONLY=1 (comms-first deploy).
 * Full stack still loads everything; comms-only loads comms + this bridge.
 */
import type { Express } from "express";

export async function registerUiEngineBridge(app: Express): Promise<void> {
  try {
    const { registerAdvancedUpgradeRoutes } = await import("../ai/upgrades/routes.js");
    registerAdvancedUpgradeRoutes(app);
    console.log("[UiEngineBridge] Orchestrator / upgrade engine routes registered");
  } catch (e) {
    console.warn(
      "[UiEngineBridge] Orchestrator routes failed (non-fatal):",
      e instanceof Error ? e.message : String(e),
    );
  }

  app.post("/api/infer", async (req, res) => {
    try {
      const { message, systemContext, moduleContext } = req.body ?? {};
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const openaiApiKey =
        process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.json({
          response:
            "CYRUS command console is online. Set OPENAI_API_KEY (or AI_INTEGRATIONS_OPENAI_API_KEY) to enable AI replies; comms and presence use Socket.IO /cyrus-io.",
          degraded: true,
        });
      }

      const OpenAI = (await import("openai")).default;
      const { getCyrusChatModel } = await import("../ai/cyrus-model.js");
      const client = new OpenAI({
        apiKey: openaiApiKey,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      let orchestratorHint = "";
      try {
        const moM = await import("../ai/upgrades/module-orchestrator.js");
        await moM.moduleOrchestrator.init();
        const ctx = await moM.moduleOrchestrator.buildUnifiedContext(String(message), {
          module: moduleContext,
        });
        if (ctx && typeof ctx === "object") {
          orchestratorHint = JSON.stringify(ctx).slice(0, 4000);
        }
      } catch {
        /* orchestrator optional */
      }

      const systemParts = [
        typeof systemContext === "string" ? systemContext : "",
        orchestratorHint ? `Orchestrator context:\n${orchestratorHint}` : "",
      ].filter(Boolean);

      const completion = await client.chat.completions.create({
        model: getCyrusChatModel(),
        messages: [
          {
            role: "system",
            content:
              systemParts.join("\n\n") ||
              "You are CYRUS, the integrated command-center assistant.",
          },
          { role: "user", content: message },
        ],
        max_tokens: 900,
        temperature: 0.4,
      });

      return res.json({
        response: completion.choices[0]?.message?.content?.trim() || "—",
      });
    } catch (e) {
      console.error("[UiEngineBridge] /api/infer error:", e);
      return res.status(500).json({
        error: "Inference failed",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  console.log("[UiEngineBridge] Command console /api/infer registered");
}
