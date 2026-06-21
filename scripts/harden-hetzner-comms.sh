#!/usr/bin/env bash
# Harden CYRUS comms on Hetzner: Caddy WebSocket/upload tuning, TURN/SFU env, scale limits.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLIC_IP="${CYRUS_SFU_ANNOUNCED_IP:-${TURN_EXTERNAL_IP:-}}"
if [[ -z "$PUBLIC_IP" ]]; then
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
fi
if [[ -z "$PUBLIC_IP" ]]; then
  echo "Set CYRUS_SFU_ANNOUNCED_IP or TURN_EXTERNAL_IP" >&2
  exit 1
fi

SITE_HOST="${CYRUS_HTTPS_HOST:-${PUBLIC_IP//./-}.sslip.io}"
HTTPS_URL="https://${SITE_HOST}"

touch .env
upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

echo "→ Public IP: ${PUBLIC_IP}"
echo "→ HTTPS host: ${SITE_HOST}"

# Core comms / WebRTC
bash scripts/integrate-production-comms.sh

upsert_env PUBLIC_BASE_URL "$HTTPS_URL"
upsert_env BASE_URL "$HTTPS_URL"
upsert_env CYRUS_HTTPS_HOST "$SITE_HOST"
upsert_env TRUST_PROXY "1"
upsert_env CYRUS_SFU_WORKER_COUNT "${CYRUS_SFU_WORKER_COUNT:-4}"
upsert_env CYRUS_SFU_MAX_PARTICIPANTS "${CYRUS_SFU_MAX_PARTICIPANTS:-128}"
upsert_env HTTP_KEEP_ALIVE_TIMEOUT_MS "120000"
upsert_env HTTP_HEADERS_TIMEOUT_MS "125000"

# Regenerate Caddy config from template
mkdir -p deploy/caddy
python3 -c "
from pathlib import Path
host = '''${SITE_HOST}'''
t = Path('deploy/caddy/Caddyfile').read_text()
Path('deploy/caddy/Caddyfile.generated').write_text(t.replace('{\$SITE_HOST}', host))
print('Caddyfile.generated updated for', host)
"

echo "→ Reloading Caddy + app..."
docker compose up -d caddy
docker compose up -d --build --force-recreate app

echo "→ Waiting for health..."
for _ in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${CYRUS_LIVE_PORT:-3020}/health/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo ""
echo "→ Local comms verification..."
CYRUS_VERIFY_URL="http://127.0.0.1:${CYRUS_LIVE_PORT:-3020}" node scripts/verify-comms-stack.mjs

echo ""
echo "→ Public HTTPS verification..."
CYRUS_VERIFY_URL="$HTTPS_URL" node scripts/verify-comms-stack.mjs || true

echo ""
echo "Harden complete."
echo "  Open: ${HTTPS_URL}"
echo "  TURN: turn:${PUBLIC_IP}:3478"
echo "  SFU UDP: 40000-40100"
echo ""
echo "If WebRTC still fails from some networks, ensure Hetzner Cloud Firewall allows:"
echo "  TCP 80,443 · UDP/TCP 3478 · UDP 40000-40100 · UDP 49152-65535 (coturn relay)"
