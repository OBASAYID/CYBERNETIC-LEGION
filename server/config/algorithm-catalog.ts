/**
 * Unified catalog of CYRUS algorithms: orchestrator engines, HTTP-invocable upgrade APIs,
 * and Python `server/quantum_ai/core_algorithms` families (metadata for documentation / UI).
 */

import { ENGINE_MODULE_ROUTE_MAP } from "../../shared/engine-module-routes.js";

export type AlgorithmApiRef = { method: "GET" | "POST"; path: string; summary?: string };

export type AlgorithmCatalogItem = {
  id: string;
  name: string;
  description: string;
  /** Primary UI route in cyrus-ui Command Center */
  uiRoute?: string;
  /** REST entrypoints (relative to same origin /api) */
  apis?: AlgorithmApiRef[];
};

export type AlgorithmFamily = {
  id: string;
  title: string;
  description: string;
  items: AlgorithmCatalogItem[];
};

function engineItems(): AlgorithmCatalogItem[] {
  const entries: [string, string][] = [
    ["vector-knowledge", "Vector knowledge & semantic retrieval"],
    ["emotional-cognition", "Emotion, sentiment, and empathy templates"],
    ["universal-language", "Language detection, translation, simplification"],
    ["decentralized-intelligence", "Distributed task workers and queue"],
    [
      "iot-ntn-connectivity",
      "3GPP NTN satellite IoT + integrated CYRUS Comm P2P signaling (/cyrus-comm-io, /api/cyrus-comm/config/webrtc)",
    ],
    ["ethical-governance", "Ethics assessment and moderation"],
    ["self-evolution", "Self-improvement and knowledge synthesis"],
    ["quantum-neural", "Quantum circuit simulation and inference"],
    ["ai-simulations", "Multi-agent / physics-style simulations"],
    ["cross-dimensional", "Tensor / high-dimensional reasoning"],
    ["nanotechnology", "Molecular / nanostructure simulation"],
    ["hyperlinked-reality", "AR scenes and holographic displays"],
    ["bio-neural", "BCI signal paths and neurofeedback"],
    ["adaptive-hardware", "Robotics, IoT, and embodied commands"],
    ["biology", "Interactive biology lab surface"],
    ["environmental", "Environmental sensing"],
    ["medical", "Medical diagnostics surface"],
    ["robotic", "Robotic integration"],
    ["teaching", "Teaching & learning"],
    ["security", "Security & encryption"],
    ["blood-sampling", "Blood sampling workflows"],
    ["quantum-nexus", "Nexus bridge / external intelligence"],
  ];
  return entries.map(([id, description]) => ({
    id,
    name: id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    description,
    uiRoute: ENGINE_MODULE_ROUTE_MAP[id] ?? "/modules",
    apis: [
      { method: "GET", path: "/api/orchestrator/modules", summary: "All engine statuses" },
      { method: "POST", path: "/api/orchestrator/process", summary: "Run orchestrated pipeline" },
    ],
  }));
}

function upgradeApiFamilies(): AlgorithmFamily[] {
  return [
    {
      id: "knowledge-language",
      title: "Knowledge & language",
      description: "Vector store, emotion, and multilingual NLP upgrade APIs.",
      items: [
        {
          id: "semantic-search",
          name: "Semantic search",
          description: "Embedding-style retrieval over the vector knowledge base.",
          uiRoute: "/files",
          apis: [
            { method: "POST", path: "/api/upgrades/knowledge/search" },
            { method: "POST", path: "/api/upgrades/knowledge/context" },
          ],
        },
        {
          id: "emotion-nlp",
          name: "Emotion & sentiment",
          description: "Text emotion, crisis hints, and conversational empathy context.",
          uiRoute: "/comms",
          apis: [
            { method: "POST", path: "/api/upgrades/emotion/analyze" },
            { method: "POST", path: "/api/upgrades/emotion/context" },
          ],
        },
        {
          id: "universal-nlp",
          name: "Universal language",
          description: "Detect, translate, and domain terminology simplification.",
          uiRoute: "/scan",
          apis: [
            { method: "POST", path: "/api/upgrades/language/detect" },
            { method: "POST", path: "/api/upgrades/language/translate" },
            { method: "POST", path: "/api/upgrades/language/simplify" },
            { method: "GET", path: "/api/upgrades/language/supported" },
          ],
        },
      ],
    },
    {
      id: "distributed-ethics-evolution",
      title: "Distributed tasks, ethics, evolution",
      description: "Worker scaling, safety, and self-evolution metrics.",
      items: [
        {
          id: "distributed",
          name: "Decentralized intelligence",
          description: "Submit tasks, inspect workers, scale pool.",
          uiRoute: "/ops",
          apis: [
            { method: "POST", path: "/api/upgrades/distributed/submit" },
            { method: "GET", path: "/api/upgrades/distributed/status" },
            { method: "POST", path: "/api/upgrades/distributed/scale" },
          ],
        },
        {
          id: "ethics",
          name: "Ethical governance",
          description: "Assess content, moderate, and list principles.",
          uiRoute: "/security",
          apis: [
            { method: "POST", path: "/api/upgrades/ethics/assess" },
            { method: "POST", path: "/api/upgrades/ethics/moderate" },
            { method: "GET", path: "/api/upgrades/ethics/principles" },
          ],
        },
        {
          id: "evolution",
          name: "Self-evolution",
          description: "Evolution metrics, synthesis, and cycle control.",
          uiRoute: "/ops",
          apis: [
            { method: "GET", path: "/api/upgrades/evolution/metrics" },
            { method: "POST", path: "/api/upgrades/evolution/synthesize" },
            { method: "POST", path: "/api/upgrades/evolution/trigger-cycle" },
          ],
        },
      ],
    },
    {
      id: "quantum-sim-dimensional",
      title: "Quantum, simulation & tensors",
      description: "Circuits, environments, and cross-dimensional reasoning.",
      items: [
        {
          id: "quantum-api",
          name: "Quantum neural",
          description: "Circuits, shots, and quantum-enhanced inference.",
          uiRoute: "/quantum",
          apis: [
            { method: "GET", path: "/api/upgrades/quantum/status" },
            { method: "POST", path: "/api/upgrades/quantum/create" },
            { method: "POST", path: "/api/upgrades/quantum/simulate" },
            { method: "POST", path: "/api/upgrades/quantum/infer" },
          ],
        },
        {
          id: "simulations",
          name: "AI simulations",
          description: "Environments, stepping, and scenario runs.",
          uiRoute: "/quantum",
          apis: [
            { method: "GET", path: "/api/upgrades/simulations/status" },
            { method: "POST", path: "/api/upgrades/simulations/create" },
            { method: "POST", path: "/api/upgrades/simulations/step" },
            { method: "POST", path: "/api/upgrades/simulations/scenario" },
          ],
        },
        {
          id: "dimensional",
          name: "Cross-dimensional",
          description: "Tensors, FFT, and dimensional reasoning.",
          uiRoute: "/quantum",
          apis: [
            { method: "GET", path: "/api/upgrades/dimensional/status" },
            { method: "POST", path: "/api/upgrades/dimensional/fft" },
            { method: "POST", path: "/api/upgrades/dimensional/analyze" },
            { method: "POST", path: "/api/upgrades/dimensional/reason" },
          ],
        },
      ],
    },
    {
      id: "nano-ar-bci-hardware",
      title: "Nanotech, AR, BCI & hardware",
      description: "Materials simulation, spatial UI, neural interfaces, and devices.",
      items: [
        {
          id: "nanotech",
          name: "Nanotechnology",
          description: "Structures, runs, and analysis.",
          uiRoute: "/biology",
          apis: [
            { method: "GET", path: "/api/upgrades/nanotech/status" },
            { method: "POST", path: "/api/upgrades/nanotech/create-structure" },
            { method: "POST", path: "/api/upgrades/nanotech/simulate" },
          ],
        },
        {
          id: "ar",
          name: "Hyperlinked reality",
          description: "Scenes, objects, holograms, environment analysis.",
          uiRoute: "/scan",
          apis: [
            { method: "GET", path: "/api/upgrades/ar/status" },
            { method: "POST", path: "/api/upgrades/ar/analyze-environment" },
          ],
        },
        {
          id: "bci",
          name: "Bio-neural interface",
          description: "Connect, interpret neural activity, neurofeedback.",
          uiRoute: "/medical",
          apis: [
            { method: "GET", path: "/api/upgrades/bci/status" },
            { method: "POST", path: "/api/upgrades/bci/interpret" },
          ],
        },
        {
          id: "hardware",
          name: "Adaptive hardware",
          description: "Device commands, arms, IoT.",
          uiRoute: "/device",
          apis: [
            { method: "GET", path: "/api/upgrades/hardware/status" },
            { method: "POST", path: "/api/upgrades/hardware/command" },
            { method: "POST", path: "/api/upgrades/hardware/interpret" },
          ],
        },
      ],
    },
  ];
}

function pythonCoreAlgorithms(): AlgorithmFamily {
  return {
    id: "python-core-algorithms",
    title: "Python core algorithms (Quantum AI / data science)",
    description:
      "Foundations-of-data-science style library under server/quantum_ai/core_algorithms (SVD, clustering, graphs, topic models, streaming, quantum-enhanced ML). Invoked from Python training / quantum_ai_core pipelines—not every entry has a dedicated Node REST shim.",
    items: [
      { id: "svd", name: "SVD & best-fit subspaces", description: "Singular value decomposition analysis module." },
      { id: "clustering", name: "Clustering", description: "Clustering engines for structure discovery." },
      { id: "topic", name: "Topic modeling", description: "Topic models, NMF-style and related." },
      { id: "graph", name: "Graph analysis", description: "Graph algorithms and structure metrics." },
      { id: "streaming", name: "Streaming / massive data", description: "Algorithms for large-scale streaming data." },
      { id: "high-dim", name: "High-dimensional analysis", description: "High-dimensional data characterization." },
      { id: "ml", name: "ML processor", description: "Classical ML orchestration helpers." },
      { id: "random-walks", name: "Random walks", description: "Random walk analyzers on graphs and processes." },
      { id: "math-format", name: "Mathematical formatter", description: "Equations and algorithmic presentation." },
      { id: "writing-style", name: "Writing style analyzer", description: "Stylistic analysis for responses." },
      { id: "q-ml", name: "Quantum-enhanced ML", description: "QKernel SVM, QPCA, QNN, QAOA-style processors (Python)." },
    ].map((x) => ({ ...x, uiRoute: "/algorithms" })),
  };
}

function assetMlFamily(): AlgorithmFamily {
  return {
    id: "asset-intelligence",
    title: "Asset intelligence (ML / data mining)",
    description:
      "Ridge-calibrated web asset scoring, TF-IDF tag mining, domain clustering, and ML-prioritized ingestion — OpenAI-free.",
    items: [
      {
        id: "asset-ml-scoring",
        name: "Asset ML scoring",
        description: "Ridge regression calibration for relevance, trust, license safety, retrieval priority.",
        uiRoute: "/intelligence",
        apis: [
          { method: "GET", path: "/api/assets/ml/status", summary: "ML model + mining status" },
          { method: "POST", path: "/api/assets/train", summary: "Train asset intelligence model" },
          { method: "POST", path: "/api/assets/mine", summary: "ML-guided bulk mining (ml: true)" },
          { method: "GET", path: "/api/assets/search", summary: "Search with ML-ranked retrieval" },
        ],
      },
      {
        id: "asset-data-mining",
        name: "Web asset data mining",
        description: "Wikimedia + DuckDuckGo crawl, tag vocabulary mining, query expansion, knowledge sync.",
        uiRoute: "/intelligence",
        apis: [
          { method: "POST", path: "/api/assets/resume", summary: "Resume failed downloads" },
          { method: "POST", path: "/api/assets/ingest/url", summary: "Ingest URL" },
        ],
      },
    ],
  };
}

export function getAlgorithmCatalog() {
  return {
    version: "1.0.0",
    orchestrator: {
      title: "Module orchestrator engines",
      description: "TypeScript upgrade modules registered in the unified orchestrator; each maps to a Command Center surface.",
      items: engineItems(),
    },
    upgradeApis: upgradeApiFamilies(),
    pythonCore: pythonCoreAlgorithms(),
    assetIntelligence: assetMlFamily(),
    mcp: {
      id: "cyrus-mcp",
      title: "CYRUS MCP integration",
      description: "Model Context Protocol servers for asset ingestion and data collection — stdio (Cursor) + REST (/api/mcp).",
      items: [
        {
          id: "mcp-catalog",
          name: "MCP catalog",
          description: "Discover integrated MCP servers and tools.",
          apis: [
            { method: "GET", path: "/api/mcp/catalog" },
            { method: "GET", path: "/api/mcp/status" },
            { method: "GET", path: "/api/mcp/health" },
            { method: "POST", path: "/api/mcp/invoke" },
          ],
        },
        {
          id: "mcp-asset-ingest",
          name: "MCP asset ingest",
          description: "Cursor MCP: cyrus-asset-ingest (8 tools).",
          uiRoute: "/intelligence",
        },
        {
          id: "mcp-intelligence",
          name: "MCP intelligence automation",
          description: "Cursor MCP: cyrus-intelligence (status, run, grow).",
          uiRoute: "/intelligence",
        },
        {
          id: "mcp-data-collection",
          name: "MCP data collection",
          description: "Cursor MCP: cyrus-data-collection (3 tools).",
        },
      ],
    },
  };
}
