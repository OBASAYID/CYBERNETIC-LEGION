/**
 * CYRUS MCP registry — single source of truth for MCP servers, tools, and in-process invocation.
 * Used by stdio MCP servers, REST `/api/mcp/*`, stack summary, and fusion bootstrap.
 */

import fs from "fs";
import path from "path";

export type McpToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpServerDef = {
  id: string;
  name: string;
  description: string;
  configPaths: string[];
  npmScript: string;
  env: Record<string, string>;
  tools: McpToolDef[];
};

const REPO_ROOT = process.cwd();

export const CYRUS_MCP_SERVERS: McpServerDef[] = [
  {
    id: "cyrus-asset-ingest",
    name: "CYRUS Asset Ingestion",
    description: "ML-guided web asset mining, URL ingest, resume, search, and ridge-calibrated scoring (OpenAI-free).",
    configPaths: [".cursor/mcp.json", ".vscode/mcp.json"],
    npmScript: "mcp:asset-ingest",
    env: {
      CYRUS_ML_ASSETS: "true",
      CYRUS_OPENAI_INDEPENDENT: "true",
      CYRUS_ML_KNOWLEDGE_SYNC: "true",
    },
    tools: [
      {
        name: "cyrus_ingest_status",
        description: "Get asset library stats, ML model status, failed downloads, and active jobs.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      {
        name: "cyrus_ingest_mine",
        description: "Start ML-guided bulk web asset mining (images + 3D models).",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "number" },
            useMl: { type: "boolean" },
            wait: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
      {
        name: "cyrus_ingest_resume",
        description: "Resume failed downloads from the failure journal.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      {
        name: "cyrus_ingest_url",
        description: "Download and register a single image or 3D model URL.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            title: { type: "string" },
            domain: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            license: { type: "string" },
          },
          required: ["url"],
          additionalProperties: false,
        },
      },
      {
        name: "cyrus_ingest_search",
        description: "Search local asset library; optionally fetch from Wikimedia.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            kind: { type: "string", enum: ["image", "model_3d"] },
            domain: { type: "string" },
            limit: { type: "number" },
            fetchIfMissing: { type: "boolean" },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      {
        name: "cyrus_ingest_train_ml",
        description: "Train ridge-calibrated asset intelligence model.",
        inputSchema: {
          type: "object",
          properties: { simulations: { type: "number" }, wait: { type: "boolean" } },
          additionalProperties: false,
        },
      },
      {
        name: "cyrus_ingest_data_mining",
        description: "TF-IDF tag mining, domain clustering, expanded query catalog.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      {
        name: "cyrus_ingest_urls_batch",
        description: "Ingest multiple asset URLs in one call.",
        inputSchema: {
          type: "object",
          properties: {
            urls: { type: "array", items: { type: "string" } },
            domain: { type: "string" },
          },
          required: ["urls"],
          additionalProperties: false,
        },
      },
    ],
  },
  {
    id: "cyrus-data-collection",
    name: "CYRUS Data Collection",
    description: "Web scrape, multi-URL aggregation, knowledge-base search; auto-ingests page images.",
    configPaths: [".cursor/mcp.json", ".vscode/mcp.json"],
    npmScript: "mcp:data-collection",
    env: { CYRUS_INGEST_SCRAPED_ASSETS: "true" },
    tools: [
      {
        name: "cyrus_scrape_url",
        description: "Scrape a web page for text, links, and images.",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"],
          additionalProperties: false,
        },
      },
      {
        name: "cyrus_collect_web",
        description: "Collect from multiple web sources via data-collection aggregator.",
        inputSchema: {
          type: "object",
          properties: { urls: { type: "array", items: { type: "string" } } },
          required: ["urls"],
          additionalProperties: false,
        },
      },
      {
        name: "cyrus_knowledge_search",
        description: "Search the local CYRUS knowledge base.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" }, limit: { type: "number" } },
          required: ["query"],
          additionalProperties: false,
        },
      },
    ],
  },
  {
    id: "cyrus-intelligence",
    name: "CYRUS Intelligence Automation",
    description: "Autonomous intelligence cycle — asset mining, ML calibration, MCP health, self-correction.",
    configPaths: [".cursor/mcp.json", ".vscode/mcp.json"],
    npmScript: "mcp:intelligence",
    env: {
      CYRUS_INTELLIGENCE_AUTO: "0",
      CYRUS_OPENAI_INDEPENDENT: "true",
      CYRUS_ML_ASSETS: "true",
    },
    tools: [
      {
        name: "cyrus_intelligence_status",
        description: "Get intelligence automation status, models, asset library, and last cycle result.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      {
        name: "cyrus_intelligence_run",
        description: "Run one full autonomous intelligence cycle (observe, MCP, mine, calibrate, verify).",
        inputSchema: {
          type: "object",
          properties: {
            assetTarget: { type: "number" },
            trainSimulations: { type: "number" },
            quickMineBatch: { type: "number" },
            mineAssets: { type: "boolean" },
            trainModels: { type: "boolean" },
            resumeDownloads: { type: "boolean" },
            mcpHealth: { type: "boolean" },
            selfCorrect: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
      {
        name: "cyrus_intelligence_grow",
        description: "Mine Wikipedia + web knowledge and intelligence assets into CYRUS brain/KB.",
        inputSchema: {
          type: "object",
          properties: {
            assetTarget: { type: "number" },
            fullAssetMining: { type: "boolean" },
            wait: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
    ],
  },
];

function findServer(serverId: string): McpServerDef | undefined {
  return CYRUS_MCP_SERVERS.find((s) => s.id === serverId);
}

function findTool(serverId: string, toolName: string): McpToolDef | undefined {
  return findServer(serverId)?.tools.find((t) => t.name === toolName);
}

/** Invoke an MCP tool in-process (same handlers as stdio MCP servers). */
export async function invokeMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  if (!findTool(serverId, toolName)) {
    throw new Error(`Unknown MCP tool ${serverId}/${toolName}`);
  }

  if (serverId === "cyrus-asset-ingest") {
    const svc = await import("../assets/asset-ingest-service.js");
    switch (toolName) {
      case "cyrus_ingest_status":
        return svc.getIngestStatus();
      case "cyrus_ingest_mine":
        return svc.startIngestMining({
          target: typeof args.target === "number" ? args.target : undefined,
          useMl: args.useMl !== false,
          wait: args.wait === true,
        });
      case "cyrus_ingest_resume":
        return svc.resumeIngestFailures();
      case "cyrus_ingest_url": {
        if (typeof args.url !== "string") throw new Error("url is required");
        const record = await svc.ingestAssetUrl({
          url: args.url,
          title: typeof args.title === "string" ? args.title : undefined,
          domain: typeof args.domain === "string" ? (args.domain as any) : undefined,
          tags: Array.isArray(args.tags) ? args.tags.map(String) : undefined,
          license: typeof args.license === "string" ? args.license : undefined,
        });
        return { success: Boolean(record), total: svc.getIngestStatus().total, asset: record };
      }
      case "cyrus_ingest_search": {
        if (typeof args.query !== "string") throw new Error("query is required");
        return {
          query: args.query,
          results: await svc.searchIngestAssets({
            query: args.query,
            kind: args.kind as any,
            domain: typeof args.domain === "string" ? (args.domain as any) : undefined,
            limit: typeof args.limit === "number" ? args.limit : 12,
            fetchIfMissing: args.fetchIfMissing !== false,
          }),
        };
      }
      case "cyrus_ingest_train_ml":
        return svc.startMlTraining({
          simulations: typeof args.simulations === "number" ? args.simulations : undefined,
          wait: args.wait === true,
        });
      case "cyrus_ingest_data_mining":
        return svc.getDataMiningInsights();
      case "cyrus_ingest_urls_batch": {
        if (!Array.isArray(args.urls)) throw new Error("urls array required");
        return {
          ingested: await svc.ingestAssetUrls(args.urls.map(String), typeof args.domain === "string" ? (args.domain as any) : undefined),
          total: svc.getIngestStatus().total,
        };
      }
      default:
        break;
    }
  }

  if (serverId === "cyrus-data-collection") {
    switch (toolName) {
      case "cyrus_scrape_url": {
        if (typeof args.url !== "string") throw new Error("url required");
        const { WebScraper } = await import("../data-collection/web-scraper.js");
        return new WebScraper().scrapeUrl(args.url);
      }
      case "cyrus_collect_web": {
        if (!Array.isArray(args.urls)) throw new Error("urls required");
        const { DataAggregator } = await import("../data-collection/aggregator.js");
        const agg = new DataAggregator();
        await agg.initialize();
        return agg.collectFromSources(args.urls.map((url) => ({ type: "web" as const, url: String(url) })));
      }
      case "cyrus_knowledge_search": {
        if (typeof args.query !== "string") throw new Error("query required");
        const { KnowledgeBase } = await import("../data-collection/knowledge-base.js");
        const kb = new KnowledgeBase();
        await kb.initialize();
        return kb.search(args.query, typeof args.limit === "number" ? args.limit : 10);
      }
      default:
        break;
    }
  }

  if (serverId === "cyrus-intelligence") {
    const auto = await import("../ai/intelligence-automation-core.js");
    switch (toolName) {
      case "cyrus_intelligence_status":
        return auto.getAutomationStatus();
      case "cyrus_intelligence_run": {
        const overrides: Record<string, unknown> = {};
        if (typeof args.assetTarget === "number") overrides.assetTarget = args.assetTarget;
        if (typeof args.trainSimulations === "number") overrides.trainSimulations = args.trainSimulations;
        if (typeof args.quickMineBatch === "number") overrides.quickMineBatch = args.quickMineBatch;
        if (typeof args.mineAssets === "boolean") overrides.mineAssets = args.mineAssets;
        if (typeof args.trainModels === "boolean") overrides.trainModels = args.trainModels;
        if (typeof args.resumeDownloads === "boolean") overrides.resumeDownloads = args.resumeDownloads;
        if (typeof args.mcpHealth === "boolean") overrides.mcpHealth = args.mcpHealth;
        if (typeof args.selfCorrect === "boolean") overrides.selfCorrect = args.selfCorrect;
        return auto.runIntelligenceAutomationCycle(overrides);
      }
      case "cyrus_intelligence_grow": {
        const growth = await import("../intelligence/intelligence-growth-miner.js");
        const input = {
          assetTarget: typeof args.assetTarget === "number" ? args.assetTarget : undefined,
          fullAssetMining: args.fullAssetMining === true,
        };
        if (args.wait === true) return growth.runIntelligenceGrowth(input);
        return growth.startIntelligenceGrowth(input);
      }
      default:
        break;
    }
  }

  throw new Error(`Unhandled MCP tool ${serverId}/${toolName}`);
}

export function getMcpCatalog() {
  return {
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    integrated: true,
    servers: CYRUS_MCP_SERVERS.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      npmScript: s.npmScript,
      toolCount: s.tools.length,
      tools: s.tools.map((t) => ({ name: t.name, description: t.description })),
      restInvoke: `/api/mcp/invoke/${s.id}/{toolName}`,
    })),
    cursorConfig: ".cursor/mcp.json",
    vscodeConfig: ".vscode/mcp.json",
  };
}

export function getMcpIntegrationStatus() {
  const cursorConfig = path.join(REPO_ROOT, ".cursor", "mcp.json");
  const vscodeConfig = path.join(REPO_ROOT, ".vscode", "mcp.json");
  const assetServer = path.join(REPO_ROOT, "server", "mcp", "cyrus-asset-ingest-server.ts");
  const dataServer = path.join(REPO_ROOT, "server", "mcp", "cyrus-data-collection-server.ts");
  const intelligenceServer = path.join(REPO_ROOT, "server", "mcp", "cyrus-intelligence-server.ts");

  return {
    integrated: true,
    transport: ["stdio", "rest"],
    config: {
      cursor: fs.existsSync(cursorConfig),
      vscode: fs.existsSync(vscodeConfig),
    },
    servers: CYRUS_MCP_SERVERS.map((s) => ({
      id: s.id,
      entrypoint: `server/mcp/${s.id}-server.ts`,
      npmScript: s.npmScript,
      tools: s.tools.length,
      env: s.env,
    })),
    files: {
      assetIngestServer: fs.existsSync(assetServer),
      dataCollectionServer: fs.existsSync(dataServer),
      intelligenceServer: fs.existsSync(intelligenceServer),
    },
    api: {
      catalog: "/api/mcp/catalog",
      status: "/api/mcp/status",
      invoke: "POST /api/mcp/invoke",
    },
  };
}

export function getToolsForServer(serverId: string): McpToolDef[] {
  return findServer(serverId)?.tools ?? [];
}

export function getServerIds(): string[] {
  return CYRUS_MCP_SERVERS.map((s) => s.id);
}
