import { Router } from "express";
import axios from "axios";

import { getCyrusAiBaseUrl, getStackPortsPayload } from "../config/stack-ports.js";
import { getDeploymentPayload } from "../config/deployment.js";
import { getCyrusCommWebRtcConfigResponse } from "../comms/cyrus-comm-config.js";
import { pushCallServiceConfigured } from "../comms/push-call-service.js";
import { getMcpIntegrationStatus } from "../mcp/mcp-registry.js";
import { checkAllMcpHealth } from "../mcp/mcp-health.js";
import { handleDebugSessionLogPost } from "../../shared/cyrus-debug-session-log.js";

const router = Router();

router.post("/debug/session-log", (req, res) => {
  void handleDebugSessionLogPost(req.body, res);
});

router.get("/stack/ports", (_req, res) => {
  res.json({ success: true, ...getStackPortsPayload(), ts: Date.now() });
});

router.get("/stack/deployment", (_req, res) => {
  res.json({ success: true, ...getDeploymentPayload(), ts: Date.now() });
});

router.get("/comms/webrtc-health", (_req, res) => {
  try {
    const cfg = getCyrusCommWebRtcConfigResponse();
    res.json({
      ok: true,
      relayConfigured: cfg.relayConfigured,
      iceServerCount: Array.isArray(cfg.iceServers) ? cfg.iceServers.length : 0,
      iceTransportPolicy: cfg.iceTransportPolicy,
      encodingProfile: cfg.linkHints?.encodingProfile,
      satelliteBackhaulCapable: cfg.linkHints?.satelliteBackhaulCapable,
    });
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/comms/push/status", (_req, res) => {
  res.json({
    configured: pushCallServiceConfigured(),
    redis: Boolean(String(process.env.REDIS_URL || "").trim()),
  });
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

  let mcpHealth: Awaited<ReturnType<typeof checkAllMcpHealth>> | null = null;
  try {
    mcpHealth = await checkAllMcpHealth();
  } catch {
    mcpHealth = null;
  }

  res.json({
    success: true,
    stack,
    cyrusAiReachable,
    orchestrator,
    mcp: {
      ...getMcpIntegrationStatus(),
      health: mcpHealth
        ? {
            operational: mcpHealth.operational,
            activeCount: mcpHealth.activeCount,
            totalServers: mcpHealth.totalServers,
            totalTools: mcpHealth.totalTools,
            servers: mcpHealth.servers.map((s) => ({
              id: s.id,
              active: s.active,
              stdio: s.stdioOperational,
              rest: s.restOperational,
            })),
          }
        : null,
    },
    ts: Date.now(),
  });
});

export default router;
