#!/usr/bin/env bash
# Starts the integrated stack briefly and probes critical HTTP surfaces.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${TEST_PORT:-39888}"
export PORT
# Fused server honors CYRUS_LIVE_PORT; if it diverges from PORT (e.g. .env), /health/ready is never hit on $PORT.
export CYRUS_LIVE_PORT="${PORT}"
export CYRUS_SINGLE_ORIGIN=1
export NODE_ENV="${NODE_ENV:-development}"
export CYRUS_UI_ROOT="${CYRUS_UI_ROOT:-cyrus-ui}"
export TMPDIR="${TMPDIR:-/tmp}"
# Match PasswordGate defaults; dotenv does not override vars already set in the shell.
export USER_ACCESS_CODE=170392
export ADMIN_ACCESS_CODE=71580019

READY_URL="http://127.0.0.1:${PORT}/health/ready"
BASE="http://127.0.0.1:${PORT}"
COOKIE_JAR="/tmp/cyrus_integration_smoke_cookies.txt"

echo "Integration smoke: PORT=$PORT CYRUS_UI_ROOT=$CYRUS_UI_ROOT"

cleanup() {
  if [[ -n "${SRV_PID:-}" ]] && kill -0 "$SRV_PID" 2>/dev/null; then
    kill "$SRV_PID" 2>/dev/null || true
    wait "$SRV_PID" 2>/dev/null || true
  fi
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

npx tsx server/index.ts &
SRV_PID=$!

ok=0
for _ in $(seq 1 90); do
  if curl -sf "$READY_URL" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "FAIL: /health/ready not OK within 90s" >&2
  exit 1
fi

check_json() {
  local url="$1"
  local label="$2"
  local use_auth="${3:-}"
  local code
  local auth_hdr=()
  if [[ -n "${SESSION_TOKEN:-}" ]]; then
    auth_hdr=(-H "Authorization: Bearer ${SESSION_TOKEN}")
  fi
  if [[ "$use_auth" == "auth" ]]; then
    code="$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" "${auth_hdr[@]}" -o /tmp/cyrus_smoke_body.json -w "%{http_code}" "$url" || echo "000")"
  else
    code="$(curl -sS -o /tmp/cyrus_smoke_body.json -w "%{http_code}" "$url" || echo "000")"
  fi
  if [[ "$code" != "200" ]]; then
    echo "FAIL: $label -> HTTP $code ($url)" >&2
    cat /tmp/cyrus_smoke_body.json >&2 || true
    exit 1
  fi
}

check_json "$BASE/api/status" "GET /api/status (public)"

login_code="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/cyrus_smoke_login.json -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"username":"IntegrationSmoke","code":"170392"}' \
  "$BASE/api/login" || echo "000")"
if [[ "$login_code" != "200" ]]; then
  echo "FAIL: POST /api/login -> HTTP $login_code" >&2
  cat /tmp/cyrus_smoke_login.json >&2 || true
  exit 1
fi

# Token-first login returns sessionToken; isAuthenticated accepts Bearer (see standalone/auth-adapter.ts).
SESSION_TOKEN=""
if command -v python3 >/dev/null 2>&1; then
  SESSION_TOKEN="$(python3 -c "import json; print(json.load(open('/tmp/cyrus_smoke_login.json')).get('sessionToken') or '')" 2>/dev/null || true)"
fi
if [[ -z "$SESSION_TOKEN" ]] && command -v node >/dev/null 2>&1; then
  SESSION_TOKEN="$(node -e "const j=require('/tmp/cyrus_smoke_login.json');process.stdout.write(String(j.sessionToken||''))" 2>/dev/null || true)"
fi
export SESSION_TOKEN

check_json "$BASE/api/cyrus/status" "GET /api/cyrus/status (authenticated)" "auth"
check_json "$BASE/api/cyrus-comm/config/webrtc" "GET /api/cyrus-comm/config/webrtc (authenticated)" "auth"
check_json "$BASE/api/cyrus/branches" "GET /api/cyrus/branches (authenticated)" "auth"
check_json "$BASE/api/files/module-status" "GET /api/files/module-status (authenticated)" "auth"

post_infer_code="$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" ${SESSION_TOKEN:+-H "Authorization: Bearer ${SESSION_TOKEN}"} -o /tmp/cyrus_smoke_infer.json -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"message":"integration smoke ping"}' \
  "$BASE/api/cyrus" || echo "000")"
if [[ "$post_infer_code" != "200" ]]; then
  echo "FAIL: POST /api/cyrus -> HTTP $post_infer_code" >&2
  cat /tmp/cyrus_smoke_infer.json >&2 || true
  exit 1
fi
if ! grep -q '"response"' /tmp/cyrus_smoke_infer.json; then
  echo "FAIL: POST /api/cyrus JSON missing .response" >&2
  cat /tmp/cyrus_smoke_infer.json >&2
  exit 1
fi

html_code="$(curl -sS -b "$COOKIE_JAR" -o /tmp/cyrus_smoke_index.html -w "%{http_code}" "$BASE/" || echo "000")"
if [[ "$html_code" != "200" ]]; then
  echo "FAIL: GET / -> HTTP $html_code" >&2
  exit 1
fi
if ! grep -Eiq 'root|vite|cyrus|DOCTYPE' /tmp/cyrus_smoke_index.html; then
  echo "WARN: GET / body unexpected (no obvious HTML shell marker)" >&2
fi

echo "OK: integration smoke passed ($BASE)"
