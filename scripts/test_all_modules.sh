#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/cronet/Downloads/cyrus-part2-assets-fullzip"
cd "$ROOT"

echo "[1/9] Repo status"
git status --short || true

echo "[2/9] Node install"
npm ci

echo "[3/9] Python env + deps (root)"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
[[ -f requirements.txt ]] && pip install -r requirements.txt

echo "[4/9] Quantum AI deps"
[[ -f server/quantum_ai/requirements.txt ]] && pip install -r server/quantum_ai/requirements.txt

echo "[5/9] Frontend/Node tests"
npm run lint || true
npm run test -- --runInBand || true

echo "[6/9] Python tests"
pytest -q || true
[[ -d server/quantum_ai ]] && pytest -q server/quantum_ai || true

echo "[7/9] Build checks"
npm run build

echo "[8/9] Start app for API smoke tests"
npm run start:all > /tmp/cyrus_start.log 2>&1 &
APP_PID=$!
sleep 12

echo "[9/9] Endpoint/module smoke tests"
curl -fsS http://localhost:5003/api/training/status | python3 -m json.tool
curl -fsS http://localhost:5003/api/training/models | python3 -m json.tool
curl -fsS -X POST http://localhost:5003/api/training/classify \
  -H "Content-Type: application/json" \
  -d '{"query":"explain cardiac treatment and robotics automation"}' | python3 -m json.tool

echo "[done] all module checks executed"
kill $APP_PID || true
