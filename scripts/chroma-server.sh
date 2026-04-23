#!/usr/bin/env bash
# Start a local Chroma server (HTTP). Default http://127.0.0.1:8000 matches the JS `ChromaClient()` default.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export CHROMA_DATA_DIR="${CHROMA_DATA_DIR:-$ROOT/data/chroma-server}"
export CHROMA_HOST="${CHROMA_HOST:-127.0.0.1}"
export CHROMA_PORT="${CHROMA_PORT:-8000}"

mkdir -p "$CHROMA_DATA_DIR"

# Prefer the repo’s Node `chroma` CLI (from `npm install`); it matches `ChromaClient` in this stack.
# Use Python’s `chroma` only if it actually runs (venv can leave a broken shim after a failed pip install).
use_python_chroma=0
if [[ -f "$ROOT/.venv/bin/activate" ]]; then
  # shellcheck source=/dev/null
  . "$ROOT/.venv/bin/activate"
  if command -v chroma >/dev/null 2>&1 && chroma run --help >/dev/null 2>&1; then
    use_python_chroma=1
  fi
fi

if [[ "$use_python_chroma" -eq 1 ]]; then
  exec chroma run --path "$CHROMA_DATA_DIR" --host "$CHROMA_HOST" --port "$CHROMA_PORT" "$@"
fi

exec npx --no-install chroma run --path "$CHROMA_DATA_DIR" --host "$CHROMA_HOST" --port "$CHROMA_PORT" "$@"
