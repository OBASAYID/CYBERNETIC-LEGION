/**
 * Cross-cutting resilience helpers — retries, backoff, and readiness-aware fetch.
 */

export type ResilientFetchOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatuses?: number[];
  retryOnNetworkError?: boolean;
};

const DEFAULT_RETRY_STATUSES = [408, 429, 500, 502, 503, 504];

export function computeBackoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * Math.min(250, exp * 0.15));
  return exp + jitter;
}

export function shouldRetryResponse(
  response: Response,
  retryOnStatuses: number[],
): boolean {
  if (retryOnStatuses.includes(response.status)) return true;
  if (response.status === 503) {
    return true;
  }
  return false;
}

export async function parseSystemInitializing(response: Response): Promise<boolean> {
  if (response.status !== 503) return false;
  try {
    const body = await response.clone().json();
    return body?.code === "SYSTEM_INITIALIZING" || body?.error === "SYSTEM_INITIALIZING";
  } catch {
    return true;
  }
}

/** Retry fetch when booting (503) or transient server/network failures. */
export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const retryOnStatuses = options.retryOnStatuses ?? DEFAULT_RETRY_STATUSES;
  const retryOnNetworkError = options.retryOnNetworkError ?? true;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || attempt >= maxAttempts - 1) return response;

      const initializing = await parseSystemInitializing(response);
      if (!initializing && !shouldRetryResponse(response, retryOnStatuses)) {
        return response;
      }

      await sleep(computeBackoffDelay(attempt, baseDelayMs, maxDelayMs));
    } catch (err) {
      lastError = err;
      if (!retryOnNetworkError || attempt >= maxAttempts - 1) throw err;
      await sleep(computeBackoffDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }

  if (lastError) throw lastError;
  return fetch(input, init);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
