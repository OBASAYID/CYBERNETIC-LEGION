#!/usr/bin/env node
/** Verify all CYRUS MCP servers are integrated, active, and operational. */

import { checkAllMcpHealth, syncMcpCursorConfig } from "./mcp-health.js";

async function main() {
  const sync = syncMcpCursorConfig();
  if (sync.updated) console.log(`[MCP] Synced ${sync.path}`);

  console.log("[MCP] Probing all servers (stdio + REST smoke tests)…\n");
  const health = await checkAllMcpHealth();

  for (const s of health.servers) {
    console.log(
      `${s.active ? "✓" : "✗"} ${s.id}`,
      `stdio=${s.stdioOperational}`,
      `rest=${s.restOperational}`,
      `tools=${s.toolsListed}/${s.toolCount}`,
      s.error ? `— ${s.error}` : "",
    );
  }

  console.log(`\nExternal companion: cursor-ide-browser (enable in Cursor MCP settings)`);
  console.log(`\nResult: ${health.activeCount}/${health.totalServers} active, ${health.totalTools} tools total`);

  if (!health.operational) process.exit(1);
}

main().catch((err) => {
  console.error("[MCP] Verify failed:", err);
  process.exit(1);
});
