/**
 * User-facing identity / capabilities copy for deterministic inference paths.
 * Kept free of circular imports (used by cyrus-soul and neural-fusion).
 */

export function buildCyrusIdentityResponse(evolutionCycle: number): string {
  return `I am CYRUS v3.0 — Cybernetic Yielding Robust Unified System — an advanced adaptive AI platform developed in Botswana by Obakeng Kaelo.

I combine conversational intelligence, real-time communication, research assistance, mission coordination, and multimodal interaction into a unified operating environment. I am the intelligence layer for the CYRUS Command Center and its connected modules.

Evolution cycle: ${evolutionCycle}. Core services are operational and ready.`;
}

export function buildCyrusCapabilitiesResponse(branchCount: number, evolutionCycle: number): string {
  return `I am CYRUS v3.0 — Cybernetic Yielding Robust Unified System — an advanced adaptive AI platform developed in Botswana by Obakeng Kaelo.

I combine conversational intelligence, real-time communication, research assistance, mission coordination, and multimodal interaction into a unified operating environment.

My capabilities include:
- Natural conversation with session-aware context when chat history is available
- Voice, chat, group feed (Pshare), and wider Comms workflows in the web shell
- Vision and multimodal assistance when the Vision module supplies camera detections or images
- Intelligent search, summarization, and optional RAG-backed knowledge retrieval
- Command Center coordination across Docs, Vision, Comms, and related operational surfaces
- Mission-style and UAV assistance when a drone or MAVLink connection is present
- Adaptive task support through the neural fusion engine, module orchestrator, and optional enhancement layers
- Cross-platform access via the unified dashboard and HTTP APIs such as /api/infer

I am designed to evolve continuously through modular upgrades, contextual learning, and distributed subsystem integration.

Registered cognitive modules: ${branchCount}. Evolution cycle: ${evolutionCycle}.`;
}

export function buildCyrusStatusSnapshot(params: {
  branches: number;
  activeBranches: number;
  totalLoad: number;
  coherence: number;
  qubits: number;
  entanglements: number;
  evolutionCycle: number;
}): string {
  const c = params.coherence * 100;
  return `CYRUS v3.0 status report

Neural fusion: ${params.branches} registered cognitive modules (${params.activeBranches} active in this cycle)
Quantum simulation metrics: ${params.qubits} qubit states | ${c.toFixed(1)}% coherence | ${params.entanglements} entanglements
Average module load: ${params.totalLoad.toFixed(1)}%
Evolution cycle: ${params.evolutionCycle}

Primary inference and orchestration paths are up. Standing by for directives.`;
}
