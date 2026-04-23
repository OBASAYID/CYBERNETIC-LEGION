#!/usr/bin/env bash
# End-to-end connectivity: HTTP readiness + public API + gate login (same base as the running server).
# Requires the stack to already be listening (e.g. `npm run dev` in another terminal).
#
# Usage:
#   bash scripts/connectivity-check.sh
#   bash scripts/connectivity-check.sh http://127.0.0.1:3105
#   npm run verify:connectivity
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${1:-}"
if [[ -n "$BASE" ]]; then
  BASE="${BASE%/}"
  export CYRUS_GATE_TEST_URL="$BASE"
fi

echo "== CYRUS connectivity (HTTP + gate) =="
bash "$ROOT/scripts/health-check.sh" ${BASE:+"$BASE"}
bash "$ROOT/scripts/verify-gate.sh"
echo "== Connectivity OK =="
