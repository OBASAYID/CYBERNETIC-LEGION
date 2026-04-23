#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/runtime"
PORT_VALUE="${PORT:-3105}"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/nexus_env/bin/python}"
NODE_BIN="${NODE_BIN:-}"

export PATH="/usr/local/bin:/opt/homebrew/bin:/Library/Frameworks/Python.framework/Versions/3.12/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

mkdir -p "$LOG_DIR"
cd "$ROOT_DIR"

export NODE_ENV="production"
export PORT="$PORT_VALUE"

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3 || command -v python)"
fi

if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "$PYTHON_BIN" ]]; then
  echo "No Python interpreter found for quantum bridge" >&2
  exit 1
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "No Node.js interpreter found for production server" >&2
  exit 1
fi

if [[ ! -f "$ROOT_DIR/dist/server/index.js" || ! -f "$ROOT_DIR/dist/public/index.html" ]]; then
  echo "Production build missing. Run npm run build first." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${NODE_PID:-}" ]] && kill -0 "$NODE_PID" 2>/dev/null; then
    kill "$NODE_PID" 2>/dev/null || true
    wait "$NODE_PID" 2>/dev/null || true
  fi
  if [[ -n "${QUANTUM_PID:-}" ]] && kill -0 "$QUANTUM_PID" 2>/dev/null; then
    kill "$QUANTUM_PID" 2>/dev/null || true
    wait "$QUANTUM_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

"$PYTHON_BIN" "$ROOT_DIR/server/quantum_ai/quantum_bridge.py" >> "$LOG_DIR/quantum-bridge.log" 2>&1 &
QUANTUM_PID=$!

"$NODE_BIN" "$ROOT_DIR/dist/server/index.js" >> "$LOG_DIR/server.log" 2>&1 &
NODE_PID=$!

wait "$NODE_PID"
