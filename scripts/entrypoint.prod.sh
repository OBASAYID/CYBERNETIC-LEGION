#!/usr/bin/env bash
set -euo pipefail

PYTHON_PORT="${PYTHON_PORT:-8001}"
NODE_PORT="${CYRUS_LIVE_PORT:-${PORT:-3105}}"

cd /app/cyrus-ai
python3 -m uvicorn api:app --host 0.0.0.0 --port "${PYTHON_PORT}" &
PY_PID=$!

cleanup() {
  echo "[entrypoint] shutting down services"
  kill -TERM "$PY_PID" 2>/dev/null || true
  wait "$PY_PID" 2>/dev/null || true
}

trap cleanup SIGINT SIGTERM EXIT

cd /app
node dist/server/index.js &
NODE_PID=$!

wait "$NODE_PID"
