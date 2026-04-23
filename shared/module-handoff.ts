/**
 * Cross-module "artifact" handoff: move CYRUS text / report chunks between Command Center
 * surfaces (command console → documents → vision → comms) without a round-trip to the server.
 * Stored in sessionStorage; cleared on consume or new session.
 */
export const MODULE_HANDOFF_STORAGE_KEY = "cyrus_module_handoff_v1";

const MAX_TEXT_CHARS = 450_000;

export type ModuleHandoffPayloadV1 = {
  v: 1;
  /** Main text to edit, translate, report-ify, or share */
  text: string;
  /** Where this hop originated */
  sourceModule: string;
  /** Ordered pipeline (e.g. command-console → document-intelligence → vision) */
  history: string[];
  createdAt: number;
  title?: string;
  /** User-facing note shown on target screens */
  note?: string;
};

function clipText(s: string): string {
  if (s.length <= MAX_TEXT_CHARS) return s;
  return `${s.slice(0, MAX_TEXT_CHARS)}\n\n… [trimmed for storage]`;
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function isV1(x: unknown): x is ModuleHandoffPayloadV1 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.v === 1 && typeof o.text === "string" && typeof o.sourceModule === "string" && Array.isArray(o.history);
}

export function saveHandoff(
  input: Omit<ModuleHandoffPayloadV1, "v" | "createdAt" | "history"> & {
    history?: string[];
    createdAt?: number;
  },
): ModuleHandoffPayloadV1 {
  const payload: ModuleHandoffPayloadV1 = {
    v: 1,
    text: clipText(input.text),
    sourceModule: input.sourceModule,
    history: input.history?.length ? [...input.history] : [input.sourceModule],
    createdAt: input.createdAt ?? Date.now(),
    title: input.title,
    note: input.note,
  };
  if (typeof window === "undefined") return payload;
  try {
    window.sessionStorage.setItem(MODULE_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota — still return payload for in-memory use by caller if needed
  }
  return payload;
}

/**
 * @param consume - if true, remove from sessionStorage after read (one-shot delivery).
 */
export function readHandoff(consume: boolean = true): ModuleHandoffPayloadV1 | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(MODULE_HANDOFF_STORAGE_KEY);
  if (!raw) return null;
  const data = safeJsonParse(raw);
  if (!isV1(data)) {
    if (consume) window.sessionStorage.removeItem(MODULE_HANDOFF_STORAGE_KEY);
    return null;
  }
  if (consume) {
    try {
      window.sessionStorage.removeItem(MODULE_HANDOFF_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return data;
}

export function clearHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(MODULE_HANDOFF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Append a step and save (chain: e.g. after generating a report, forward to vision). */
export function pushHandoffFromCurrent(
  newText: string,
  fromModule: string,
  toModule: string,
  opts?: { title?: string; note?: string },
): ModuleHandoffPayloadV1 {
  const prev = readHandoff(false);
  const history = prev ? [...prev.history, fromModule] : [fromModule];
  return saveHandoff({
    text: newText,
    sourceModule: toModule,
    history,
    title: opts?.title,
    note: opts?.note ?? `Continued from ${fromModule}`,
  });
}
