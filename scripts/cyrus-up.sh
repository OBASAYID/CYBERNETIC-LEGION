#!/usr/bin/env bash
# Safe local dev launcher: one Express + Vite process (same origin as /api/*).
# Does not delete lockfiles, overwrite configs, or scaffold a second server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

UI_MODE="cyrus-ui"
WITH_PYTHON=0
INSTALL=0
OPEN_BROWSER=0

usage() {
  sed -n '1,80p' <<'EOF'
Usage: bash scripts/cyrus-up.sh [options]

  --ui cyrus-ui|main|default   Integrated dashboard + Command Center modules (default): cyrus-ui/
  --ui client                  VS Code Command Center shell only: client/
  --ui replit|original         Replit export snapshot: original-cyrus-ui-extracted/client

  --with-python          Also run cyrus-ai FastAPI (CYRUS_AI_PORT, default 8001)
  --install              Run npm install at repo root and in cyrus-ui (no rm -rf)
  --open                 After a short delay, open http://localhost:$PORT (macOS open)

  -h, --help             This help

Examples:
  npm run cyrus:up
  bash scripts/cyrus-up.sh --ui cyrus-ui --with-python --open

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ui)
      shift
      UI_MODE="${1:-}"
      shift || true
      ;;
    --with-python) WITH_PYTHON=1; shift ;;
    --install) INSTALL=1; shift ;;
    --open) OPEN_BROWSER=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ROOT/server/index.ts" ]] || [[ ! -f "$ROOT/package.json" ]]; then
  echo "Run this from the CYRUS repo root (expected server/index.ts)." >&2
  exit 1
fi

case "$UI_MODE" in
  main|default|cyrus-ui)
    export CYRUS_UI_ROOT="cyrus-ui"
    if [[ ! -f "$ROOT/cyrus-ui/index.html" ]]; then
      echo "Missing cyrus-ui/index.html" >&2
      exit 1
    fi
    ;;
  client)
    export CYRUS_UI_ROOT="client"
    if [[ ! -f "$ROOT/client/index.html" ]]; then
      echo "Missing client/index.html" >&2
      exit 1
    fi
    ;;
  replit|original)
    export CYRUS_UI_ROOT="original-cyrus-ui-extracted/client"
    if [[ ! -f "$ROOT/$CYRUS_UI_ROOT/index.html" ]]; then
      echo "Missing $CYRUS_UI_ROOT/index.html — Replit UI export not present." >&2
      exit 1
    fi
    ;;
  *)
    echo "Invalid --ui: use cyrus-ui (default), client, or replit|original." >&2
    exit 1
    ;;
esac

export NODE_ENV=development
export TMPDIR="${TMPDIR:-/tmp}"
# Fused stack: one HTTP port; ignore VITE_CYRUS_API_BASE from .env so UI + /api share the same origin.
export CYRUS_SINGLE_ORIGIN=1

if [[ "$INSTALL" -eq 1 ]]; then
  npm install
  if [[ -d "$ROOT/cyrus-ui" ]]; then
    (cd "$ROOT/cyrus-ui" && npm install --legacy-peer-deps)
  fi
fi

PORT_HINT="${CYRUS_LIVE_PORT:-${PORT:-}}"
if [[ -z "$PORT_HINT" ]] && [[ -f "$ROOT/.env" ]]; then
  PORT_HINT="$(awk -F= '/^CYRUS_LIVE_PORT=/ { gsub(/\r/, "", $2); print $2; exit }' "$ROOT/.env")"
fi
if [[ -z "$PORT_HINT" ]] && [[ -f "$ROOT/.env" ]]; then
  PORT_HINT="$(awk -F= '/^PORT=/ { gsub(/\r/, "", $2); print $2; exit }' "$ROOT/.env")"
fi
[[ -z "$PORT_HINT" ]] && PORT_HINT=3105
export CYRUS_LIVE_PORT="$PORT_HINT"
export PORT="$PORT_HINT"

echo ""
echo "CYRUS dev — UI root: ${CYRUS_UI_ROOT:-cyrus-ui/ (vite default)}"
echo "Fused system:    http://localhost:${PORT_HINT}  (CYRUS_LIVE_PORT — UI + /api + HMR + sockets)"
if [[ "$WITH_PYTHON" -eq 1 ]]; then
  echo "Python core:   http://localhost:${CYRUS_AI_PORT:-8001}  (CYRUS_AI_PORT)"
fi
echo ""

if [[ "$OPEN_BROWSER" -eq 1 ]]; then
  (sleep 2 && open "http://localhost:${PORT_HINT}") >/dev/null 2>&1 || true
fi

if [[ "$WITH_PYTHON" -eq 1 ]]; then
  exec npx concurrently -n "cyrus-ai,web" -c "magenta,green" \
    "python3 cyrus-ai/api.py" \
    "tsx server/index.ts"
else
  exec npx tsx server/index.ts
fi
