/**
 * Lightweight in-process metrics collector.
 *
 * Tracks API response times, error rates, database query durations, and
 * memory usage without requiring an external metrics backend. Metrics are
 * exposed via the /api/status endpoint and logged periodically.
 */

import { logger } from "./logger.js";

interface Counter {
  total: number;
  errors: number;
}

interface Histogram {
  count: number;
  sum: number;
  min: number;
  max: number;
}

function emptyHistogram(): Histogram {
  return { count: 0, sum: 0, min: Infinity, max: -Infinity };
}

function recordHistogram(h: Histogram, value: number): void {
  h.count += 1;
  h.sum += value;
  if (value < h.min) h.min = value;
  if (value > h.max) h.max = value;
}

function histogramAvg(h: Histogram): number {
  return h.count === 0 ? 0 : h.sum / h.count;
}

// ── State ────────────────────────────────────────────────────────────────────

const apiRequests: Record<string, Counter> = {};
const apiLatency: Record<string, Histogram> = {};
const dbQueryLatency: Histogram = emptyHistogram();
let dbQueryErrors = 0;
const startedAt = Date.now();

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a completed API request.
 *
 * @param route   Normalised route label, e.g. "POST /api/cyrus"
 * @param status  HTTP status code
 * @param durationMs  Wall-clock time in milliseconds
 */
export function recordApiRequest(route: string, status: number, durationMs: number): void {
  if (!apiRequests[route]) {
    apiRequests[route] = { total: 0, errors: 0 };
    apiLatency[route] = emptyHistogram();
  }
  apiRequests[route].total += 1;
  if (status >= 500) apiRequests[route].errors += 1;
  recordHistogram(apiLatency[route], durationMs);
}

/**
 * Record a completed database query.
 *
 * @param durationMs  Query wall-clock time in milliseconds
 * @param error       Whether the query failed
 */
export function recordDbQuery(durationMs: number, error = false): void {
  recordHistogram(dbQueryLatency, durationMs);
  if (error) dbQueryErrors += 1;
}

/**
 * Return a snapshot of all collected metrics.
 */
export function getMetrics() {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  const routes = Object.keys(apiRequests).map((route) => ({
    route,
    total: apiRequests[route].total,
    errors: apiRequests[route].errors,
    errorRate:
      apiRequests[route].total === 0
        ? 0
        : +(apiRequests[route].errors / apiRequests[route].total).toFixed(4),
    avgLatencyMs: +histogramAvg(apiLatency[route]).toFixed(2),
    minLatencyMs: apiLatency[route].min === Infinity ? 0 : +apiLatency[route].min.toFixed(2),
    maxLatencyMs: apiLatency[route].max === -Infinity ? 0 : +apiLatency[route].max.toFixed(2),
  }));

  return {
    uptimeSeconds,
    memory: {
      heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMb: +(mem.heapTotal / 1024 / 1024).toFixed(2),
      rssMb: +(mem.rss / 1024 / 1024).toFixed(2),
      externalMb: +(mem.external / 1024 / 1024).toFixed(2),
    },
    database: {
      queryCount: dbQueryLatency.count,
      queryErrors: dbQueryErrors,
      avgQueryMs: +histogramAvg(dbQueryLatency).toFixed(2),
      minQueryMs: dbQueryLatency.min === Infinity ? 0 : +dbQueryLatency.min.toFixed(2),
      maxQueryMs: dbQueryLatency.max === -Infinity ? 0 : +dbQueryLatency.max.toFixed(2),
    },
    api: {
      totalRoutes: routes.length,
      routes,
    },
  };
}

// ── Periodic logging ─────────────────────────────────────────────────────────

const METRICS_LOG_INTERVAL_MS =
  Number.parseInt(process.env.CYRUS_METRICS_LOG_INTERVAL_MS || "600000");

if (METRICS_LOG_INTERVAL_MS > 0 && typeof setInterval === "function") {
  setInterval(() => {
    const metrics = getMetrics();
    logger.info("[Metrics] API + Database snapshot", { metrics });
  }, METRICS_LOG_INTERVAL_MS);
}
