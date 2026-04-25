#!/usr/bin/env bash
set -euo pipefail

PYTHON_PORT="${PYTHON_PORT:-8001}"
NODE_PORT="${CYRUS_LIVE_PORT:-${PORT:-3105}}"
ENABLE_PYTHON="${CYRUS_ENABLE_PYTHON:-0}"

PY_PID=""
if [ "$ENABLE_PYTHON" = "1" ] || [ "$ENABLE_PYTHON" = "true" ]; then
  cd /app/cyrus-ai
  python3 -m uvicorn api:app --host 0.0.0.0 --port "${PYTHON_PORT}" &
  PY_PID=$!
  echo "[entrypoint] python service enabled on :${PYTHON_PORT}"
else
  echo "[entrypoint] python service disabled (CYRUS_ENABLE_PYTHON=${ENABLE_PYTHON})"
fi

cleanup() {
  echo "[entrypoint] shutting down services"
  if [ -n "${PY_PID}" ]; then
    kill -TERM "$PY_PID" 2>/dev/null || true
    wait "$PY_PID" 2>/dev/null || true
  fi
}

trap cleanup SIGINT SIGTERM EXIT

cd /app
node dist/server/index.js &
NODE_PID=$!

wait "$NODE_PID"
