/**
 * Shared mapping from module-orchestrator engine id → Command Center UI path.
 * Used by cyrus-ui dashboard and server algorithm catalog.
 */
/**
 * Engine id → path must match `cyrus-ui/src/command-center-routes.tsx` and `command-center-nav.ts`
 * (not the older standalone pages like `/device-control` unless you add redirects).
 */
export const ENGINE_MODULE_ROUTE_MAP: Record<string, string> = {
  "vector-knowledge": "/files",
  "emotional-cognition": "/comms",
  "universal-language": "/scan",
  "decentralized-intelligence": "/ops",
  "iot-ntn-connectivity": "/comms",
  "ethical-governance": "/security",
  "self-evolution": "/ops",
  "quantum-neural": "/quantum",
  "ai-simulations": "/ops",
  "cross-dimensional": "/quantum",
  "nanotechnology": "/biology",
  "hyperlinked-reality": "/design",
  "bio-neural": "/medical",
  "adaptive-hardware": "/device",
  biology: "/biology",
  environmental: "/nav",
  medical: "/medical",
  robotic: "/drone",
  teaching: "/ai-assistant",
  security: "/security",
  "blood-sampling": "/blood",
  "quantum-nexus": "/ops",
};

export function getDesignatedModuleRouteForEngine(engineId: string): string | null {
  return ENGINE_MODULE_ROUTE_MAP[engineId] ?? null;
}
