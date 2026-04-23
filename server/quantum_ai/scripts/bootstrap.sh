#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[bootstrap] Installing Node dependencies"
if command -v npm >/dev/null 2>&1; then
  npm ci
else
  echo "[bootstrap] npm is required but not found on PATH" >&2
  exit 1
fi

echo "[bootstrap] Installing Python dependencies"
if command -v uv >/dev/null 2>&1; then
  uv sync
else
  PYTHON_BIN=""
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "[bootstrap] Python is required but not found on PATH" >&2
    exit 1
  fi

  "$PYTHON_BIN" -m pip install --upgrade pip
  "$PYTHON_BIN" -m pip install -e .
  "$PYTHON_BIN" -m pip install -r server/quantum_ai/requirements.txt pytest
fi

echo "[bootstrap] Completed. Next: npm run dev"
