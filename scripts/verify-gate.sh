#!/usr/bin/env bash
# Quick check that POST /api/login accepts codes from the current environment (default base http://127.0.0.1:3105).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi
NODE_ENV="${NODE_ENV:-development}"
PORT="${PORT:-}"
if [[ -z "$PORT" ]] && [[ -f "$ROOT/.env" ]]; then
  PORT="$(awk -F= '/^PORT=/ { gsub(/\r/, "", $2); print $2; exit }' "$ROOT/.env" 2>/dev/null || true)"
fi
PORT="${CYRUS_LIVE_PORT:-${PORT:-3105}}"
BASE="${CYRUS_GATE_TEST_URL:-http://127.0.0.1:${PORT}}"
ready="$(curl -sS -o /tmp/verify_ready.json -w "%{http_code}" "$BASE/api/ready" 2>/dev/null || echo "000")"
if [[ "$ready" == "404" ]]; then
  echo "FAIL: GET /api/ready not found (expected 200 or 503 while booting)" >&2
  exit 1
fi
USER_CODE="${USER_ACCESS_CODE:-}"
ADMIN_CODE="${ADMIN_ACCESS_CODE:-}"
# Align with standalone auth dev defaults (see standalone/auth-adapter.ts).
if [[ "$NODE_ENV" != "production" ]]; then
  [[ -z "$USER_CODE" ]] && USER_CODE="170392"
  [[ -z "$ADMIN_CODE" ]] && ADMIN_CODE="71580019"
fi
if [[ -z "$USER_CODE" || -z "$ADMIN_CODE" ]]; then
  echo "USER_ACCESS_CODE / ADMIN_ACCESS_CODE missing (required in production, or set NODE_ENV=development for dev defaults)" >&2
  exit 1
fi
for label in "user:$USER_CODE" "admin:$ADMIN_CODE"; do
  code="${label#*:}"
  http="$(curl -sS -o /tmp/verify_gate.json -w "%{http_code}" -H "Content-Type: application/json" \
    -d "{\"username\":\"GateVerify\",\"code\":\"$code\"}" "$BASE/api/login" || echo "000")"
  if [[ "$http" != "200" ]]; then
    echo "FAIL $label -> HTTP $http" >&2
    cat /tmp/verify_gate.json >&2 || true
    exit 1
  fi
done
echo "OK: gate accepts USER_ACCESS_CODE and ADMIN_ACCESS_CODE at $BASE"
