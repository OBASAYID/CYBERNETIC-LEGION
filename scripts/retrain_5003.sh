set -euo pipefail
PORT=5003

echo "[info] start training"
curl -s -X POST "http://localhost:${PORT}/api/training/start" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

echo "[info] polling..."
while true; do
  out="$(curl -s "http://localhost:${PORT}/api/training/status")"
  phase="$(python3 - <<'PY' "$out"
import json,sys
d=json.loads(sys.argv[1]); print(d.get("progress",{}).get("phase","unknown"))
PY
)"
  pct="$(python3 - <<'PY' "$out"
import json,sys
d=json.loads(sys.argv[1]); print(d.get("progress",{}).get("progress",0))
PY
)"
  echo "[$(date '+%H:%M:%S')] phase=${phase} progress=${pct}%"

  if [[ "$phase" == "completed" ]]; then
    echo "[ok] completed"
    break
  fi
  if [[ "$phase" == "error" ]]; then
    echo "[error] failed"
    echo "$out" | python3 -m json.tool
    exit 1
  fi
  sleep 2
done

echo "[info] model summary"
curl -s "http://localhost:${PORT}/api/training/models" | python3 -m json.tool
