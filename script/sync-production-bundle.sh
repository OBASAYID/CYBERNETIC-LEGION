#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_ROOT="${CYRUS_SERVICE_ROOT:-$HOME/cyrus-service}"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/nexus_env/bin/python}"

mkdir -p "$SERVICE_ROOT"

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3 || command -v python)"
fi

rsync -a --delete \
  --include '/dist/***' \
  --include '/public/***' \
  --include '/server/' \
  --include '/server/quantum_ai/***' \
  --include '/script/' \
  --include '/script/start-production.sh' \
  --include '/package.json' \
  --include '/package-lock.json' \
  --include '/.env' \
  --exclude '*' \
  "$ROOT_DIR/" "$SERVICE_ROOT/"

chmod +x "$SERVICE_ROOT/script/start-production.sh"

cd "$SERVICE_ROOT"
npm ci

if [[ -n "$PYTHON_BIN" ]]; then
  "$PYTHON_BIN" -m pip install -q numpy scipy scikit-learn networkx matplotlib pandas mmh3 >/dev/null 2>&1 || true
fi

echo "Synced production bundle to $SERVICE_ROOT"
