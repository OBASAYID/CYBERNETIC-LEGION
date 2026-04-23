#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
exec uvicorn api:app --workers "${CYRUS_AI_WORKERS:-4}" --host 0.0.0.0 --port "${CYRUS_AI_PORT:-8001}"
