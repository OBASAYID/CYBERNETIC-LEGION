/**
 * Single entry for browser → CYRUS Express (same origin or `VITE_CYRUS_API_BASE`).
 * Use this for fetches that must not depend on the optional global `fetch` patch in `fetch-fusion-bootstrap.ts`.
 */
export {
  systemFetch,
  systemApiUrl,
  systemCredentials,
  resolveCyrusWebSocketUrl,
  resolveCyrusSocketIoOrigin,
  appendCommSignalingTokenToSearchParams,
} from "@shared/cyrus-api-client";

export const SYSTEM_INITIALIZING_CODE = "SYSTEM_INITIALIZING" as const;

export type CyrusApiErrorBody = {
  message?: string;
  code?: string;
  hint?: string;
  /** Present on `/api/ready` */
  status?: string;
  channel?: string;
};

export function isSystemInitializingResponse(res: Response, body?: CyrusApiErrorBody | null): boolean {
  if (res.status !== 503) return false;
  if (!body) return true;
  if (body.code === SYSTEM_INITIALIZING_CODE) return true;
  if (body.message === "System initializing") return true;
  if (body.status === "initializing") return true;
  return false;
}

/** One-shot JSON parse for error surfaces (consumes the response body). */
export async function readCyrusErrorBody(res: Response): Promise<CyrusApiErrorBody | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    const j = JSON.parse(text) as CyrusApiErrorBody;
    return j && typeof j === "object" ? j : null;
  } catch {
    return null;
  }
}
