import { Router } from "express";
import axios from "axios";

import { getCyrusAiBaseUrl, getStackPortsPayload } from "../config/stack-ports.js";

const router = Router();

router.get("/stack/ports", (_req, res) => {
  res.json({ success: true, ...getStackPortsPayload(), ts: Date.now() });
});

router.get("/stack/summary", async (_req, res) => {
  const stack = getStackPortsPayload();
  let cyrusAiReachable: boolean | null = null;
  try {
    const base = getCyrusAiBaseUrl();
    const r = await axios.get(`${base}/healthz`, {
      timeout: 2500,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    cyrusAiReachable = r.status >= 200 && r.status < 300;
  } catch {
    cyrusAiReachable = false;
  }

  let orchestrator: { totalModules: number; initialized: boolean; error?: string } = {
    totalModules: 0,
    initialized: false,
  };
  try {
    const mo = await import("../ai/upgrades/module-orchestrator.js");
    // Keep summary responsive even if deep module init is slow or blocked.
    await Promise.race([
      mo.moduleOrchestrator.init(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("module orchestrator init timeout")), 1200)),
    ]);
    orchestrator = {
      totalModules: mo.moduleOrchestrator.getAllModuleStatus().length,
      initialized: true,
    };
  } catch (e) {
    orchestrator = {
      totalModules: 0,
      initialized: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  res.json({
    success: true,
    stack,
    cyrusAiReachable,
    orchestrator,
    ts: Date.now(),
  });
});

export default router;
