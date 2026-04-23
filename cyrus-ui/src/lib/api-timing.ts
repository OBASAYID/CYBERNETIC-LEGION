/** Per-request cap for auth/health fetches. Override in `.env`: VITE_API_FETCH_TIMEOUT_MS=12000 */
export function getApiFetchTimeoutMs(): number {
  const raw = import.meta.env?.VITE_API_FETCH_TIMEOUT_MS;
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (Number.isFinite(n) && n >= 2_000 && n <= 120_000) return n;
  return 8_000;
}
