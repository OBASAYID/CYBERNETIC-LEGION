#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Match `tsx server/index.ts` behavior: dotenv loads PORT from .env, but this shell script does not unless we read it.
RESOLVED_PORT="${PORT:-}"
if [[ -z "$RESOLVED_PORT" ]] && [[ -f "$ROOT/.env" ]]; then
  RESOLVED_PORT="$(awk -F= '/^PORT=/ { gsub(/\r/, "", $2); print $2; exit }' "$ROOT/.env" 2>/dev/null || true)"
fi
RESOLVED_PORT="${CYRUS_LIVE_PORT:-${RESOLVED_PORT:-${PORT:-3105}}}"
BASE_URL="${1:-http://127.0.0.1:${RESOLVED_PORT}}"
TMP_DIR="${TMPDIR:-/tmp}"
STATUS_BODY="$TMP_DIR/cyrus_health_status.json"
INFER_BODY="$TMP_DIR/cyrus_health_infer.json"
READY_BODY="$TMP_DIR/cyrus_health_ready.json"

MAX_WAIT_SECONDS="${HEALTHCHECK_MAX_WAIT_SECONDS:-90}"
WAIT_INTERVAL_SECONDS=2

elapsed=0
while true; do
  ready_code="$(curl -sS -o "$READY_BODY" -w "%{http_code}" "$BASE_URL/health/ready" || true)"
  if [[ "$ready_code" == "200" ]]; then
    break
  fi

  if (( elapsed >= MAX_WAIT_SECONDS )); then
    echo "Health check failed: system not ready after ${MAX_WAIT_SECONDS}s (/health/ready returned $ready_code)"
    cat "$READY_BODY" 2>/dev/null || true
    exit 1
  fi

  sleep "$WAIT_INTERVAL_SECONDS"
  elapsed=$((elapsed + WAIT_INTERVAL_SECONDS))
done

# Public service descriptor (no session). Authenticated dashboards use GET /api/cyrus/status after login.
status_code="$(curl -sS -o "$STATUS_BODY" -w "%{http_code}" "$BASE_URL/api/status")"
if [[ "$status_code" != "200" ]]; then
  echo "Health check failed: /api/status returned $status_code"
  cat "$STATUS_BODY"
  exit 1
fi

infer_code="$(curl -sS -o "$INFER_BODY" -w "%{http_code}" -H "Content-Type: application/json" -d '{"message":"health check ping"}' "$BASE_URL/api/cyrus")"
if [[ "$infer_code" != "200" ]]; then
  echo "Health check failed: /api/cyrus returned $infer_code"
  cat "$INFER_BODY"
  exit 1
fi

if ! grep -q '"response"' "$INFER_BODY"; then
  echo "Health check failed: /api/cyrus response JSON missing response field"
  cat "$INFER_BODY"
  exit 1
fi

echo "CYRUS health check passed for $BASE_URL"
