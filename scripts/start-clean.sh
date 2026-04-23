#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT_VALUE="${PORT:-3105}"
NODE_ENV_VALUE="${NODE_ENV:-development}"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping process(es) on port $port: $pids"
    kill $pids || true
  fi
}

kill_port "$PORT_VALUE"
# Internal signaling/collab port used by this system.
kill_port 5051

cd "$PROJECT_ROOT"
echo "Starting CYRUS on port $PORT_VALUE (NODE_ENV=$NODE_ENV_VALUE)..."
TMPDIR=/tmp PORT="$PORT_VALUE" NODE_ENV="$NODE_ENV_VALUE" npm run start:app
