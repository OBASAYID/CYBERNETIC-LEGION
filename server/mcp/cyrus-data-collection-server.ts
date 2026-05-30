#!/usr/bin/env node
/** CYRUS Data Collection MCP Server — stdio transport via shared registry. */

import readline from "readline";
import { getToolsForServer, invokeMcpTool } from "./mcp-registry.js";

const SERVER_ID = "cyrus-data-collection";

function send(msg: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

async function handleRequest(req: {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}): Promise<void> {
  const { id, method, params } = req;
  try {
    if (method === "initialize") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_ID, version: "1.0.0" },
        },
      });
      return;
    }
    if (method === "notifications/initialized" || method === "initialized") return;
    if (method === "ping") {
      send({ jsonrpc: "2.0", id, result: {} });
      return;
    }
    if (method === "tools/list") {
      send({ jsonrpc: "2.0", id, result: { tools: getToolsForServer(SERVER_ID) } });
      return;
    }
    if (method === "tools/call") {
      const toolName = String((params as any)?.name || "");
      const toolArgs = ((params as any)?.arguments || {}) as Record<string, unknown>;
      const result = await invokeMcpTool(SERVER_ID, toolName, toolArgs);
      send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false },
      });
      return;
    }
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: err instanceof Error ? err.message : String(err) },
    });
  }
}

async function main(): Promise<void> {
  process.stderr.write(`[MCP] ${SERVER_ID} ready — integrated with CYRUS /api/mcp/*\n`);
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    try {
      void handleRequest(JSON.parse(line));
    } catch (err) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: String(err) } });
    }
  });
}

main().catch((err) => {
  process.stderr.write(`[MCP] Fatal: ${err}\n`);
  process.exit(1);
});
