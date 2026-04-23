#!/usr/bin/env bash
# Run Node (UI + API) and Python CYRUS AI together. Loads repo-root .env.
# CYRUS_LIVE_PORT is the single public port name (PORT is synced to match).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck source=/dev/null
  . "$ROOT/.env"
fi
set +a

export CYRUS_LIVE_PORT="${CYRUS_LIVE_PORT:-${PORT:-3105}}"
export PORT="$CYRUS_LIVE_PORT"
export CYRUS_AI_PORT="${CYRUS_AI_PORT:-8001}"
export CYRUS_AI_HOST="${CYRUS_AI_HOST:-127.0.0.1}"

exec npx concurrently -n "cyrus-ai,web" -c "magenta,green" \
  "python3 cyrus-ai/api.py" \
  "npm run dev"
