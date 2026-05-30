import { Router } from "express";
import { getMcpCatalog, getMcpIntegrationStatus, invokeMcpTool, getServerIds } from "./mcp-registry.js";
import { checkAllMcpHealth, syncMcpCursorConfig } from "./mcp-health.js";

const router = Router();

router.get("/mcp/catalog", (_req, res) => {
  res.json(getMcpCatalog());
});

router.get("/mcp/status", (_req, res) => {
  res.json(getMcpIntegrationStatus());
});

/** Operational health — stdio probe + REST smoke test per server. */
router.get("/mcp/health", async (_req, res) => {
  try {
    const health = await checkAllMcpHealth();
    res.status(health.operational ? 200 : 503).json(health);
  } catch (err) {
    res.status(500).json({ operational: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/mcp/sync-config", (_req, res) => {
  const result = syncMcpCursorConfig();
  res.json({ success: true, ...result });
});

router.post("/mcp/invoke", async (req, res) => {
  const server = String(req.body?.server || "").trim();
  const tool = String(req.body?.tool || req.body?.toolName || "").trim();
  const args = (req.body?.arguments ?? req.body?.args ?? {}) as Record<string, unknown>;

  if (!server || !tool) {
    return res.status(400).json({ error: "server and tool are required" });
  }
  if (!getServerIds().includes(server)) {
    return res.status(404).json({ error: `Unknown MCP server: ${server}` });
  }

  try {
    const result = await invokeMcpTool(server, tool, args);
    res.json({ success: true, server, tool, result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/mcp/invoke/:server/:tool", async (req, res) => {
  const server = req.params.server;
  const tool = req.params.tool;
  const args = (req.body?.arguments ?? req.body ?? {}) as Record<string, unknown>;

  if (!getServerIds().includes(server)) {
    return res.status(404).json({ error: `Unknown MCP server: ${server}` });
  }

  try {
    const result = await invokeMcpTool(server, tool, args);
    res.json({ success: true, server, tool, result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export { router as mcpRouter };
