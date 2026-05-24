/**
 * MCP operational health — stdio probe, in-process smoke tests, config validation.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";
import { CYRUS_MCP_SERVERS, getServerIds, invokeMcpTool } from "./mcp-registry.js";

const REPO_ROOT = process.cwd();

export type McpServerHealth = {
  id: string;
  name: string;
  integrated: boolean;
  configPresent: boolean;
  entrypointExists: boolean;
  stdioOperational: boolean;
  restOperational: boolean;
  toolCount: number;
  toolsListed: number;
  smokeTest: "pass" | "fail" | "skip";
  active: boolean;
  error?: string;
};

const SMOKE_TESTS: Record<string, { tool: string; args: Record<string, unknown> }> = {
  "cyrus-asset-ingest": { tool: "cyrus_ingest_status", args: {} },
  "cyrus-data-collection": { tool: "cyrus_knowledge_search", args: { query: "cyrus", limit: 1 } },
  "cyrus-intelligence": { tool: "cyrus_intelligence_status", args: {} },
};

function readCursorMcpConfig(): Record<string, unknown> | null {
  try {
    const p = path.join(REPO_ROOT, ".cursor", "mcp.json");
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function serverInCursorConfig(serverId: string): boolean {
  const cfg = readCursorMcpConfig();
  const servers = (cfg?.mcpServers ?? cfg?.servers) as Record<string, unknown> | undefined;
  return Boolean(servers?.[serverId]);
}

function entrypointPath(serverId: string): string {
  return path.join(REPO_ROOT, "server", "mcp", `${serverId}-server.ts`);
}

function tsxCommand(): string {
  const local = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");
  if (fs.existsSync(local)) return local;
  return "npx";
}

function tsxArgs(scriptPath: string): string[] {
  const local = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");
  if (fs.existsSync(local)) return [scriptPath];
  return ["tsx", scriptPath];
}

/** Probe stdio MCP server: initialize + tools/list. */
export async function probeStdioMcpServer(serverId: string, timeoutMs = 12_000): Promise<{
  operational: boolean;
  toolsListed: number;
  error?: string;
}> {
  const def = CYRUS_MCP_SERVERS.find((s) => s.id === serverId);
  if (!def) return { operational: false, toolsListed: 0, error: "unknown server" };

  const script = entrypointPath(serverId);
  if (!fs.existsSync(script)) {
    return { operational: false, toolsListed: 0, error: "entrypoint missing" };
  }

  return new Promise((resolve) => {
    const cmd = tsxCommand();
    const args = tsxArgs(script);
    const child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...def.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let settled = false;
    const finish = (result: { operational: boolean; toolsListed: number; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch { /* ignore */ }
      resolve(result);
    };

    const timer = setTimeout(() => finish({ operational: false, toolsListed: 0, error: "stdio probe timeout" }), timeoutMs);

    let initOk = false;
    let toolsListed = 0;

    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.id === 1 && msg.result?.protocolVersion) initOk = true;
        if (msg.id === 2 && Array.isArray(msg.result?.tools)) {
          toolsListed = msg.result.tools.length;
          finish({
            operational: initOk && toolsListed >= def.tools.length,
            toolsListed,
            error: toolsListed < def.tools.length ? `expected ${def.tools.length} tools, got ${toolsListed}` : undefined,
          });
        }
      } catch { /* non-json stderr noise */ }
    });

    child.on("error", (err) => finish({ operational: false, toolsListed: 0, error: err.message }));

    const init = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "cyrus-health-probe", version: "1.0.0" },
      },
    };
    const list = { jsonrpc: "2.0", id: 2, method: "tools/list" };
    child.stdin.write(`${JSON.stringify(init)}\n`);
    child.stdin.write(`${JSON.stringify(list)}\n`);
  });
}

async function smokeTestRest(serverId: string): Promise<"pass" | "fail" | "skip"> {
  const spec = SMOKE_TESTS[serverId];
  if (!spec) return "skip";
  try {
    await invokeMcpTool(serverId, spec.tool, spec.args);
    return "pass";
  } catch {
    return "fail";
  }
}

export async function checkMcpServerHealth(serverId: string): Promise<McpServerHealth> {
  const def = CYRUS_MCP_SERVERS.find((s) => s.id === serverId)!;
  const entry = entrypointPath(serverId);
  const configPresent = serverInCursorConfig(serverId);
  const entrypointExists = fs.existsSync(entry);

  let stdioOperational = false;
  let toolsListed = 0;
  let stdioError: string | undefined;

  if (entrypointExists) {
    const probe = await probeStdioMcpServer(serverId);
    stdioOperational = probe.operational;
    toolsListed = probe.toolsListed;
    stdioError = probe.error;
  }

  const smokeTest = entrypointExists ? await smokeTestRest(serverId) : "fail";
  const restOperational = smokeTest === "pass" || smokeTest === "skip";

  const active = configPresent && entrypointExists && stdioOperational && restOperational;

  return {
    id: serverId,
    name: def.name,
    integrated: true,
    configPresent,
    entrypointExists,
    stdioOperational,
    restOperational,
    toolCount: def.tools.length,
    toolsListed,
    smokeTest,
    active,
    error: stdioError,
  };
}

export async function checkAllMcpHealth(): Promise<{
  operational: boolean;
  activeCount: number;
  totalServers: number;
  totalTools: number;
  servers: McpServerHealth[];
  external: Array<{ id: string; name: string; note: string }>;
  checkedAt: string;
}> {
  const servers = await Promise.all(getServerIds().map((id) => checkMcpServerHealth(id)));
  const activeCount = servers.filter((s) => s.active).length;
  const totalTools = CYRUS_MCP_SERVERS.reduce((n, s) => n + s.tools.length, 0);

  return {
    operational: activeCount === servers.length,
    activeCount,
    totalServers: servers.length,
    totalTools,
    servers,
    external: [
      {
        id: "cursor-ide-browser",
        name: "Cursor IDE Browser",
        note: "Built-in Cursor MCP for page navigation and asset URL discovery; enable in Cursor MCP settings.",
      },
    ],
    checkedAt: new Date().toISOString(),
  };
}

/** Ensure .cursor/mcp.json contains all CYRUS registry servers. */
export function syncMcpCursorConfig(): { updated: boolean; path: string } {
  const configPath = path.join(REPO_ROOT, ".cursor", "mcp.json");
  const tsxBin = fs.existsSync(path.join(REPO_ROOT, "node_modules", ".bin", "tsx"))
    ? "node_modules/.bin/tsx"
    : "npx";

  const mcpServers: Record<string, unknown> = {};
  for (const s of CYRUS_MCP_SERVERS) {
    mcpServers[s.id] = {
      command: tsxBin,
      args: tsxBin === "npx" ? ["tsx", `server/mcp/${s.id}-server.ts`] : [`server/mcp/${s.id}-server.ts`],
      env: s.env,
    };
  }

  const next = { mcpServers };
  const prev = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const nextStr = `${JSON.stringify(next, null, 2)}\n`;

  if (prev.trim() === nextStr.trim()) {
    return { updated: false, path: configPath };
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, nextStr);
  return { updated: true, path: configPath };
}

export async function initializeMcpOnBoot(): Promise<void> {
  syncMcpCursorConfig();
  const health = await checkAllMcpHealth();
  for (const s of health.servers) {
    const flag = s.active ? "ACTIVE" : "DEGRADED";
    console.log(
      `[MCP] ${flag} ${s.id} — stdio=${s.stdioOperational} rest=${s.restOperational} tools=${s.toolsListed}/${s.toolCount}${s.error ? ` (${s.error})` : ""}`,
    );
  }
  if (health.operational) {
    console.log(`[MCP] All ${health.totalServers} servers operational (${health.totalTools} tools)`);
  } else {
    console.warn(`[MCP] ${health.activeCount}/${health.totalServers} servers fully operational`);
  }
}
