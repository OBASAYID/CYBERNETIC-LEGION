/** Curated open online knowledge sources — no API keys required. */

import type { AssetDomain } from "../../shared/asset-types.js";

export type KnowledgeTopic = {
  title: string;
  category: string;
  domain: AssetDomain;
  tags: string[];
  /** Wikipedia page title (spaces ok). */
  wikipedia?: string;
};

export type WebKnowledgeSource = {
  url: string;
  title: string;
  category: string;
  domain: AssetDomain;
  tags: string[];
};

/** High-value topics for CYRUS intelligence domains. */
export const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  { title: "Artificial intelligence", category: "ai", domain: "science", tags: ["ai", "ml"], wikipedia: "Artificial intelligence" },
  { title: "Machine learning", category: "ai", domain: "science", tags: ["ml", "learning"], wikipedia: "Machine learning" },
  { title: "Deep learning", category: "ai", domain: "science", tags: ["deep-learning", "neural"], wikipedia: "Deep learning" },
  { title: "Natural language processing", category: "ai", domain: "science", tags: ["nlp", "language"], wikipedia: "Natural language processing" },
  { title: "Computer vision", category: "ai", domain: "science", tags: ["vision", "image"], wikipedia: "Computer vision" },
  { title: "Reinforcement learning", category: "ai", domain: "science", tags: ["rl", "agents"], wikipedia: "Reinforcement learning" },
  { title: "Knowledge graph", category: "ai", domain: "science", tags: ["knowledge", "graph"], wikipedia: "Knowledge graph" },
  { title: "Large language model", category: "ai", domain: "science", tags: ["llm", "transformer"], wikipedia: "Large language model" },
  { title: "Human anatomy", category: "health", domain: "anatomy", tags: ["anatomy", "body"], wikipedia: "Human anatomy" },
  { title: "Cardiovascular system", category: "health", domain: "health", tags: ["heart", "blood"], wikipedia: "Circulatory system" },
  { title: "Neuroscience", category: "health", domain: "anatomy", tags: ["brain", "nervous"], wikipedia: "Neuroscience" },
  { title: "Immunology", category: "health", domain: "health", tags: ["immune", "disease"], wikipedia: "Immunology" },
  { title: "Pharmacology", category: "health", domain: "health", tags: ["drugs", "medicine"], wikipedia: "Pharmacology" },
  { title: "Epidemiology", category: "health", domain: "health", tags: ["public-health", "disease"], wikipedia: "Epidemiology" },
  { title: "Military strategy", category: "military", domain: "military", tags: ["strategy", "tactics"], wikipedia: "Military strategy" },
  { title: "Signals intelligence", category: "military", domain: "military", tags: ["sigint", "comms"], wikipedia: "Signals intelligence" },
  { title: "Cybersecurity", category: "military", domain: "military", tags: ["security", "cyber"], wikipedia: "Cybersecurity" },
  { title: "Geospatial intelligence", category: "military", domain: "military", tags: ["geo", "imagery"], wikipedia: "Geospatial intelligence" },
  { title: "Pedagogy", category: "education", domain: "education", tags: ["teaching", "learning"], wikipedia: "Pedagogy" },
  { title: "Educational psychology", category: "education", domain: "education", tags: ["psychology", "learning"], wikipedia: "Educational psychology" },
  { title: "Collaborative learning", category: "education", domain: "education", tags: ["group", "collaboration"], wikipedia: "Collaborative learning" },
  { title: "Assessment for learning", category: "education", domain: "education", tags: ["assessment", "feedback"], wikipedia: "Assessment for learning" },
  { title: "Telecommunications", category: "communication", domain: "communication", tags: ["telecom", "network"], wikipedia: "Telecommunications" },
  { title: "Internet protocol suite", category: "communication", domain: "communication", tags: ["tcp", "ip"], wikipedia: "Internet protocol suite" },
  { title: "WebRTC", category: "communication", domain: "communication", tags: ["webrtc", "realtime"], wikipedia: "WebRTC" },
  { title: "Information theory", category: "communication", domain: "communication", tags: ["entropy", "coding"], wikipedia: "Information theory" },
  { title: "Mechanical engineering", category: "engineering", domain: "engineering", tags: ["mechanical", "design"], wikipedia: "Mechanical engineering" },
  { title: "Electrical engineering", category: "engineering", domain: "engineering", tags: ["electrical", "circuits"], wikipedia: "Electrical engineering" },
  { title: "Robotics", category: "engineering", domain: "engineering", tags: ["robot", "automation"], wikipedia: "Robotics" },
  { title: "Control theory", category: "engineering", domain: "engineering", tags: ["control", "systems"], wikipedia: "Control theory" },
  { title: "Quantum computing", category: "science", domain: "science", tags: ["quantum", "computing"], wikipedia: "Quantum computing" },
  { title: "Statistics", category: "science", domain: "science", tags: ["stats", "probability"], wikipedia: "Statistics" },
  { title: "Data mining", category: "science", domain: "science", tags: ["mining", "patterns"], wikipedia: "Data mining" },
  { title: "Systems thinking", category: "general", domain: "general", tags: ["systems", "complexity"], wikipedia: "Systems thinking" },
  { title: "Decision theory", category: "general", domain: "general", tags: ["decision", "rationality"], wikipedia: "Decision theory" },
];

/** Trusted open web pages for scrape + asset extraction. */
export const WEB_KNOWLEDGE_SOURCES: WebKnowledgeSource[] = [
  {
    url: "https://en.wikipedia.org/wiki/Open_data",
    title: "Open data",
    category: "reference",
    domain: "science",
    tags: ["open-data", "datasets"],
  },
  {
    url: "https://en.wikipedia.org/wiki/Wikimedia_Commons",
    title: "Wikimedia Commons",
    category: "reference",
    domain: "general",
    tags: ["media", "commons"],
  },
  {
    url: "https://www.nasa.gov/general/overview/",
    title: "NASA overview",
    category: "science",
    domain: "science",
    tags: ["nasa", "space"],
  },
  {
    url: "https://www.cdc.gov/about/index.html",
    title: "CDC about",
    category: "health",
    domain: "health",
    tags: ["cdc", "public-health"],
  },
  {
    url: "https://www.nist.gov/artificial-intelligence",
    title: "NIST AI",
    category: "ai",
    domain: "science",
    tags: ["nist", "ai-standards"],
  },
];

/** Extra asset mining queries for intelligence growth runs. */
export const INTELLIGENCE_ASSET_QUERIES: Array<{
  query: string;
  domain: AssetDomain;
  tags: string[];
  preferWikimedia?: boolean;
}> = [
  { query: "neural network architecture diagram", domain: "science", tags: ["neural", "ai"], preferWikimedia: true },
  { query: "transformer model attention diagram", domain: "science", tags: ["transformer", "nlp"], preferWikimedia: true },
  { query: "robotics arm kinematics diagram", domain: "engineering", tags: ["robotics", "kinematics"], preferWikimedia: true },
  { query: "satellite communication diagram", domain: "communication", tags: ["satellite", "comms"], preferWikimedia: true },
  { query: "radar cross section military", domain: "military", tags: ["radar", "tactical"] },
  { query: "electronic circuit schematic", domain: "engineering", tags: ["circuit", "schematic"], preferWikimedia: true },
  { query: "DNA double helix molecular biology", domain: "science", tags: ["genetics", "dna"], preferWikimedia: true },
  { query: "cell biology organelles diagram", domain: "health", tags: ["cell", "biology"], preferWikimedia: true },
  { query: "world map political geography", domain: "general", tags: ["map", "geography"], preferWikimedia: true },
  { query: "blockchain distributed ledger diagram", domain: "engineering", tags: ["blockchain", "crypto"] },
  { query: "microprocessor architecture block diagram", domain: "engineering", tags: ["cpu", "architecture"], preferWikimedia: true },
  { query: "optical fiber communication diagram", domain: "communication", tags: ["fiber", "network"], preferWikimedia: true },
  { query: "group work classroom collaboration", domain: "education", tags: ["groupwork", "classroom"], preferWikimedia: true },
  { query: "emergency medicine triage flowchart", domain: "health", tags: ["triage", "emergency"], preferWikimedia: true },
  { query: "unmanned aerial vehicle drone diagram", domain: "military", tags: ["uav", "drone"] },
  { query: "gltf 3d model sample engineering", domain: "engineering", tags: ["gltf", "3d"] },
  { query: "anatomy muscular system labeled diagram", domain: "anatomy", tags: ["muscle", "anatomy"], preferWikimedia: true },
  { query: "weather radar meteorology diagram", domain: "science", tags: ["weather", "radar"], preferWikimedia: true },
  { query: "software architecture microservices diagram", domain: "engineering", tags: ["microservices", "architecture"] },
  { query: "encryption public key cryptography diagram", domain: "military", tags: ["crypto", "security"], preferWikimedia: true },
];
