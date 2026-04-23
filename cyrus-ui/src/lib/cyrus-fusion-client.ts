/**
 * CYRUS API fusion client — optional split-origin API base, or same-origin Express.
 *
 * - Leave `VITE_CYRUS_API_BASE` unset → same origin (integrated dev on `PORT`, default 3020).
 * - Set `VITE_CYRUS_API_BASE` → use `/api/quantum_ai/*` paths on that host when the remote stack exposes them.
 */

import { getCyrusApiBase, resolveCyrusApiCredentials, resolveCyrusApiUrl } from "./api-url";

const url = resolveCyrusApiUrl;
const credentialsMode = resolveCyrusApiCredentials;

const useQuantumAiPaths = (): boolean => getCyrusApiBase().length > 0;

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

/** Trading + AI + drone + file helpers for scripts or non–React Query callers */
export const cyrus = {
  getMarkets: () => {
    const path = useQuantumAiPaths() ? "/api/quantum_ai/markets" : "/api/trading/markets";
    return fetch(url(path), { credentials: credentialsMode() }).then(parseJson);
  },

  getPortfolio: () => {
    const path = useQuantumAiPaths() ? "/api/quantum_ai/portfolio" : "/api/trading/portfolio";
    return fetch(url(path), { credentials: credentialsMode() }).then(parseJson);
  },

  quantumQuery: async (prompt: string) => {
    if (useQuantumAiPaths()) {
      const res = await fetch(url("/api/quantum_ai/query"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: credentialsMode(),
        body: JSON.stringify({ prompt }),
      });
      return parseJson(res);
    }
    const res = await fetch(url("/api/cyrus"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: credentialsMode(),
      body: JSON.stringify({ message: prompt, type: "conversation" }),
    });
    return parseJson(res);
  },

  droneStatus: () => {
    const path = useQuantumAiPaths() ? "/api/quantum_ai/drones" : "/api/drone/state";
    return fetch(url(path), { credentials: credentialsMode() }).then(parseJson);
  },

  sendCommand: async (cmd: string) => {
    const path = useQuantumAiPaths() ? "/api/quantum_ai/command" : "/api/drone/command";
    const res = await fetch(url(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: credentialsMode(),
      body: JSON.stringify({ command: cmd }),
    });
    return parseJson(res);
  },

  analyzeFile: (file: File) => {
    const path = useQuantumAiPaths() ? "/api/quantum_ai/analyze" : "/api/files/analyze";
    const formData = new FormData();
    formData.append("file", file);
    return fetch(url(path), {
      method: "POST",
      credentials: credentialsMode(),
      body: formData,
    }).then(parseJson);
  },

  status: () => fetch(url("/api/status"), { credentials: credentialsMode() }).then(parseJson),
};
