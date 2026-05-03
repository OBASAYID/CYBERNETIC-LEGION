/**
 * Cross-module "artifact" handoff: text, optional small inline files (base64),
 * and optional large files via IndexedDB (sessionStorage only holds refs).
 */
export const MODULE_HANDOFF_STORAGE_KEY = "cyrus_module_handoff_v1";

/** Latest CYRUS command transcript (search / Q&A) for optional import into document modules. */
export const COMMAND_SEARCH_SHARE_KEY = "cyrus_command_search_share_v1";

const HANDOFF_IDB = "cyrus_handoff_blobs_v1";
const HANDOFF_STORE = "files";

/** ~1.1M UTF-16 units — stay under typical 5MB/sessionStorage budgets for text-only handoffs. */
const MAX_TEXT_CHARS = 1_200_000;
const MAX_COMMAND_TRANSCRIPT_CHARS = 250_000;
const MAX_COMMAND_SEARCH_SHARE_CHARS = 280_000;
/** Total base64 payload size across inline attachments. */
const MAX_ATTACHMENT_TOTAL_BASE64_CHARS = 1_200_000;

export type ModuleHandoffAttachment = {
  name: string;
  mime: string;
  /** Base64 payload (no `data:` URL prefix). */
  data: string;
};

/** Large binary stored in IndexedDB; session payload only references it. */
export type ModuleHandoffLargeRef = {
  id: string;
  name: string;
  mime: string;
  size: number;
};

export type ModuleHandoffPayloadV1 = {
  v: 1;
  text: string;
  sourceModule: string;
  history: string[];
  createdAt: number;
  title?: string;
  note?: string;
  attachments?: ModuleHandoffAttachment[];
  largeAttachments?: ModuleHandoffLargeRef[];
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

function isValidAttachments(a: unknown): a is ModuleHandoffAttachment[] {
  if (!Array.isArray(a)) return false;
  for (const item of a) {
    if (!item || typeof item !== "object") return false;
    const o = item as Record<string, unknown>;
    if (typeof o.name !== "string" || typeof o.mime !== "string" || typeof o.data !== "string") return false;
  }
  return true;
}

function isValidLargeAttachments(a: unknown): a is ModuleHandoffLargeRef[] {
  if (!Array.isArray(a)) return false;
  for (const item of a) {
    if (!item || typeof item !== "object") return false;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.name !== "string" || typeof o.mime !== "string" || typeof o.size !== "number")
      return false;
  }
  return true;
}

function isV1(x: unknown): x is ModuleHandoffPayloadV1 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || typeof o.text !== "string" || typeof o.sourceModule !== "string" || !Array.isArray(o.history)) {
    return false;
  }
  if (o.attachments !== undefined && !isValidAttachments(o.attachments)) return false;
  if (o.largeAttachments !== undefined && !isValidLargeAttachments(o.largeAttachments)) return false;
  return true;
}

function clipAttachments(att: ModuleHandoffAttachment[] | undefined): ModuleHandoffAttachment[] | undefined {
  if (!att?.length) return undefined;
  const out: ModuleHandoffAttachment[] = [];
  let total = 0;
  for (const a of att) {
    const name = a.name.slice(0, 220);
    const mime = a.mime.slice(0, 120);
    const data = a.data;
    if (!data) continue;
    if (total + data.length > MAX_ATTACHMENT_TOTAL_BASE64_CHARS) break;
    out.push({ name, mime, data });
    total += data.length;
  }
  return out.length ? out : undefined;
}

function clipLargeRefs(refs: ModuleHandoffLargeRef[] | undefined): ModuleHandoffLargeRef[] | undefined {
  if (!refs?.length) return undefined;
  return refs.slice(0, 4).map((r) => ({
    id: r.id.slice(0, 120),
    name: r.name.slice(0, 240),
    mime: r.mime.slice(0, 120),
    size: r.size,
  }));
}

async function openHandoffBlobDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve) => {
    const req = indexedDB.open(HANDOFF_IDB, 1);
    req.onblocked = () => resolve(null);
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HANDOFF_STORE)) {
        db.createObjectStore(HANDOFF_STORE);
      }
    };
  });
}

/** Store a large file for pipeline handoff (IndexedDB). */
export async function registerLargeHandoffFile(file: File): Promise<ModuleHandoffLargeRef | null> {
  const db = await openHandoffBlobDb();
  if (!db) return null;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(HANDOFF_STORE, "readwrite");
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error || new Error("idb write"));
      tx.objectStore(HANDOFF_STORE).put(file, id);
    });
  } catch {
    db.close();
    return null;
  }
  db.close();
  return {
    id,
    name: file.name?.slice(0, 240) || "document",
    mime: file.type || "application/octet-stream",
    size: file.size,
  };
}

/** Read a large handoff file back as a `File`. */
export async function resolveLargeHandoffFile(ref: ModuleHandoffLargeRef): Promise<File | null> {
  const db = await openHandoffBlobDb();
  if (!db) return null;
  let blob: File | Blob | undefined;
  try {
    blob = await new Promise<File | Blob | undefined>((res, rej) => {
      const tx = db.transaction(HANDOFF_STORE, "readonly");
      const rq = tx.objectStore(HANDOFF_STORE).get(ref.id);
      rq.onsuccess = () => res(rq.result as File | Blob | undefined);
      rq.onerror = () => rej(rq.error);
    });
  } catch {
    db.close();
    return null;
  }
  db.close();
  if (!blob) return null;
  if (blob instanceof File) return blob;
  return new File([blob], ref.name, { type: ref.mime });
}

export async function revokeLargeHandoffBlobIds(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openHandoffBlobDb();
  if (!db) return;
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(HANDOFF_STORE, "readwrite");
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      for (const id of ids) {
        if (id) tx.objectStore(HANDOFF_STORE).delete(id);
      }
    });
  } catch {
    /* ignore */
  }
  db.close();
}

/** Resolve inline + IndexedDB attachments to `File` list (browser). */
export async function resolveHandoffPayloadToFiles(payload: ModuleHandoffPayloadV1): Promise<File[]> {
  const files: File[] = [];
  if (payload.attachments?.length) {
    for (const a of payload.attachments) {
      try {
        files.push(fileFromHandoffAttachment(a));
      } catch {
        /* ignore */
      }
    }
  }
  if (payload.largeAttachments?.length) {
    for (const ref of payload.largeAttachments) {
      const f = await resolveLargeHandoffFile(ref);
      if (f) files.push(f);
    }
  }
  return files;
}

/** Delete IndexedDB blobs listed on a handoff payload (call after files are copied in memory). */
export async function revokeHandoffPayloadBlobs(payload: ModuleHandoffPayloadV1): Promise<void> {
  const ids = payload.largeAttachments?.map((r) => r.id).filter(Boolean) ?? [];
  await revokeLargeHandoffBlobIds(ids);
}

function peekRawHandoff(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(MODULE_HANDOFF_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Build a shareable transcript of CYRUS command searches / Q&A (trimmed). */
export function formatCommandHandoffTranscript(log: Array<{ role: string; content: string }>): string {
  if (!log.length) return "";
  const blocks: string[] = [];
  for (const ex of log) {
    const c = ex.content.trim();
    if (!c) continue;
    const label = ex.role === "user" ? "Operator" : "CYRUS";
    blocks.push(`${label}:\n${c}`);
  }
  let merged = blocks.join("\n\n");
  if (merged.length > MAX_COMMAND_TRANSCRIPT_CHARS) {
    merged = `${merged.slice(-MAX_COMMAND_TRANSCRIPT_CHARS)}\n\n… [earlier command messages trimmed]`;
  }
  return merged;
}

export function mergeWorkspaceAndCommandHandoff(workspace: string, commandTranscript: string): string {
  const w = workspace.trim();
  const t = commandTranscript.trim();
  if (w && t) {
    return `--- Module workspace ---\n\n${w}\n\n--- CYRUS command (search / Q&A) ---\n\n${t}`;
  }
  return w || t;
}

export function writeCommandSearchShare(transcript: string): void {
  if (typeof window === "undefined") return;
  const t = transcript.trim();
  if (!t) return;
  const clipped =
    t.length > MAX_COMMAND_SEARCH_SHARE_CHARS
      ? `${t.slice(-MAX_COMMAND_SEARCH_SHARE_CHARS)}\n\n… [trimmed]`
      : t;
  try {
    window.sessionStorage.setItem(COMMAND_SEARCH_SHARE_KEY, clipped);
  } catch {
    /* ignore */
  }
}

export function readCommandSearchShare(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(COMMAND_SEARCH_SHARE_KEY);
  } catch {
    return null;
  }
}

export function clearCommandSearchShare(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(COMMAND_SEARCH_SHARE_KEY);
  } catch {
    /* ignore */
  }
}

export function attachmentFromDataUrl(
  dataUrl: string,
  filename: string,
  maxDataChars = 1_200_000,
): ModuleHandoffAttachment | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const head = dataUrl.slice(0, comma);
  if (!head.startsWith("data:") || !head.includes(";base64")) return null;
  const mimeMatch = head.match(/^data:([^;,]+)/);
  const mime = mimeMatch?.[1]?.trim() || "application/octet-stream";
  let data = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (data.length > maxDataChars) data = data.slice(0, maxDataChars);
  if (!data) return null;
  const safeName = filename.replace(/[^a-zA-Z0-9_.\- ()]/g, "_").slice(0, 200) || "capture";
  return { name: safeName, mime, data };
}

/** Inline base64 handoff for files up to ~900KB (default). Larger files should use {@link registerLargeHandoffFile}. */
export function encodeFileAsHandoffAttachment(file: File, maxBinaryBytes = 900_000): Promise<ModuleHandoffAttachment | null> {
  return new Promise((resolve) => {
    if (typeof FileReader === "undefined") {
      resolve(null);
      return;
    }
    if (file.size > maxBinaryBytes) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || "");
      const comma = r.indexOf(",");
      if (comma < 0) {
        resolve(null);
        return;
      }
      const head = r.slice(0, comma);
      if (!head.includes(";base64")) {
        resolve(null);
        return;
      }
      const mimeMatch = head.match(/^data:([^;,]+)/);
      const mime = mimeMatch?.[1]?.trim() || file.type || "application/octet-stream";
      const data = r.slice(comma + 1).replace(/\s/g, "");
      resolve({ name: file.name?.slice(0, 220) || "document", mime, data });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function fileFromHandoffAttachment(a: ModuleHandoffAttachment): File {
  const bin = atob(a.data);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new File([u8], a.name || "handoff", { type: a.mime || "application/octet-stream" });
}

export function saveHandoff(
  input: Omit<ModuleHandoffPayloadV1, "v" | "createdAt" | "history"> & {
    history?: string[];
    createdAt?: number;
    attachments?: ModuleHandoffAttachment[];
    largeAttachments?: ModuleHandoffLargeRef[];
  },
): ModuleHandoffPayloadV1 {
  const prevRaw = peekRawHandoff();
  if (prevRaw) {
    const prevData = safeJsonParse(prevRaw);
    if (isV1(prevData) && prevData.largeAttachments?.length) {
      void revokeLargeHandoffBlobIds(prevData.largeAttachments.map((r) => r.id));
    }
  }

  const attachments = clipAttachments(input.attachments);
  const largeAttachments = clipLargeRefs(input.largeAttachments);
  const payload: ModuleHandoffPayloadV1 = {
    v: 1,
    text: clipText(input.text),
    sourceModule: input.sourceModule,
    history: input.history?.length ? [...input.history] : [input.sourceModule],
    createdAt: input.createdAt ?? Date.now(),
    title: input.title,
    note: input.note,
    attachments,
    largeAttachments,
  };
  if (typeof window === "undefined") return payload;
  const write = (p: ModuleHandoffPayloadV1) => {
    window.sessionStorage.setItem(MODULE_HANDOFF_STORAGE_KEY, JSON.stringify(p));
  };
  try {
    write(payload);
  } catch {
    const fallback: ModuleHandoffPayloadV1 = {
      ...payload,
      attachments: undefined,
      largeAttachments: payload.largeAttachments,
      text: clipText(
        `${payload.text}\n\n… [inline file attachments omitted: JSON too large — large file refs kept if present.]`,
      ),
    };
    try {
      write(fallback);
    } catch {
      const textOnly: ModuleHandoffPayloadV1 = {
        ...fallback,
        largeAttachments: undefined,
        text: clipText(
          `${fallback.text}\n\n… [large file refs dropped: clear handoff and re-send, or reduce payload size.]`,
        ),
      };
      void revokeLargeHandoffBlobIds(payload.largeAttachments?.map((r) => r.id) ?? []);
      try {
        write(textOnly);
      } catch {
        /* ignore */
      }
    }
  }
  return payload;
}

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
  const raw = peekRawHandoff();
  if (raw) {
    const data = safeJsonParse(raw);
    if (isV1(data) && data.largeAttachments?.length) {
      void revokeLargeHandoffBlobIds(data.largeAttachments.map((r) => r.id));
    }
  }
  try {
    window.sessionStorage.removeItem(MODULE_HANDOFF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

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
    attachments: prev?.attachments,
    largeAttachments: prev?.largeAttachments,
  });
}
