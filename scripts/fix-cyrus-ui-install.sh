#!/usr/bin/env bash
# Reinstall cyrus-ui from a clean node_modules and verify root typecheck.
# Do NOT append lines to tsconfig.json with `echo >>` — that breaks JSON.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🔧 Fixing cyrus-ui install & typecheck..."

cd "$ROOT/cyrus-ui" || exit 1
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps --no-optional

npm run build
npm run check
echo "✅ cyrus-ui: OK"

cd "$ROOT"
if ! grep -q 'server/quantum_ai' tsconfig.json; then
  echo "ERROR: tsconfig.json must list server/quantum_ai under \"exclude\" (valid JSON array). Do not append raw lines."
  exit 1
fi
npm run typecheck
echo "✅ Root typecheck: OK"
