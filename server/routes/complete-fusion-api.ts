/**
 * Public fusion bootstrap — honest capability map for the fused UI (no demo trading/drone stubs).
 */
import { randomBytes } from "crypto";
import { Router, type Request, type Response } from "express";

const router = Router();

router.get("/fusion/bootstrap", (_req: Request, res: Response) => {
  res.json({
    tier: "production",
    protocolVersion: "1.0.0",
    channels: ["rest", "session", "inference", "mcp", "intelligence"],
    capabilities: {
      authGate: true,
      documents: true,
      vision: true,
      comms: true,
      navigation: true,
      intelligence: true,
      assetIngestion: true,
      mcpIngestion: true,
      webrtcPeers: true,
      trading: false,
      drones: false,
    },
    mcp: {
      catalog: "/api/mcp/catalog",
      status: "/api/mcp/status",
      health: "/api/mcp/health",
      invoke: "/api/mcp/invoke",
      servers: ["cyrus-asset-ingest", "cyrus-data-collection", "cyrus-intelligence"],
      external: ["cursor-ide-browser"],
    },
    surfaces: {
      health: "/health/ready",
      login: "/api/login",
      status: "/api/status",
      intelligence: "/intelligence",
      documents: "/files",
      vision: "/scan",
    },
    serverTime: new Date().toISOString(),
    uptimeMs: Math.round(process.uptime() * 1000),
  });
});

router.post("/fusion/handshake", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { displayName?: string; role?: string; client?: string };
  const fusionSessionId = `fus_${randomBytes(12).toString("hex")}`;
  res.json({
    accepted: true,
    fusionSessionId,
    tier: "production",
    echo: {
      displayName: body.displayName ?? null,
      role: body.role ?? null,
      client: body.client ?? "cyrus-ui",
    },
    issuedAt: new Date().toISOString(),
    hints: {
      useCredentials: "include",
      bootstrapPath: "/api/fusion/bootstrap",
    },
  });
});

export default router;
