/**
 * Shared mapping from module-orchestrator engine id → Command Center UI path.
 * Only routes to operational surfaces (see `cyrus-ui/src/config/command-center-nav.ts`).
 */
export const ENGINE_MODULE_ROUTE_MAP: Record<string, string> = {
  "vector-knowledge": "/files",
  "emotional-cognition": "/comms",
  "universal-language": "/scan",
  "decentralized-intelligence": "/intelligence",
  "iot-ntn-connectivity": "/comms",
  "ethical-governance": "/security",
  "self-evolution": "/intelligence",
  "quantum-neural": "/quantum",
  "ai-simulations": "/intelligence",
  "cross-dimensional": "/quantum",
  "nanotechnology": "/biology",
  "hyperlinked-reality": "/scan",
  "bio-neural": "/medical",
  "adaptive-hardware": "/device",
  biology: "/biology",
  environmental: "/nav",
  medical: "/medical",
  robotic: "/intelligence",
  teaching: "/files",
  security: "/security",
  "blood-sampling": "/medical",
  "quantum-nexus": "/quantum",
};

export function getDesignatedModuleRouteForEngine(engineId: string): string | null {
  return ENGINE_MODULE_ROUTE_MAP[engineId] ?? null;
}
