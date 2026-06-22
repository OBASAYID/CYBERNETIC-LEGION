#!/usr/bin/env bash
# Enable HTTPS for CYRUS on Hetzner (required for WebRTC camera/mic).
set -euo pipefail
cd "$(dirname "$0")/.."

PUBLIC_IP="${CYRUS_PUBLIC_IP:-$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)}"
if [[ -z "$PUBLIC_IP" ]]; then
  echo "Set CYRUS_PUBLIC_IP or ensure outbound HTTPS works" >&2
  exit 1
fi

SITE_HOST="${CYRUS_HTTPS_HOST:-${PUBLIC_IP//./-}.sslip.io}"
HTTPS_URL="https://${SITE_HOST}"

echo "→ HTTPS host: ${SITE_HOST}"
echo "→ Public IP:  ${PUBLIC_IP}"

mkdir -p deploy/caddy
python3 -c "
from pathlib import Path
host = '''${SITE_HOST}'''
t = Path('deploy/caddy/Caddyfile').read_text()
Path('deploy/caddy/Caddyfile.generated').write_text(t.replace('{\$SITE_HOST}', host))
"

if ! grep -q 'caddy:' docker-compose.production.yml 2>/dev/null; then
  echo "Add caddy service to docker-compose.production.yml first" >&2
  exit 1
fi

touch .env
upsert() {
  local k="$1" v="$2"
  if grep -q "^${k}=" .env; then sed -i.bak "s|^${k}=.*|${k}=${v}|" .env; else echo "${k}=${v}" >> .env; fi
}
upsert PUBLIC_BASE_URL "$HTTPS_URL"
upsert BASE_URL "$HTTPS_URL"
upsert CYRUS_HTTPS_HOST "$SITE_HOST"

docker compose -f docker-compose.production.yml up -d caddy
docker compose -f docker-compose.production.yml up -d --force-recreate app

echo ""
echo "HTTPS enabled."
echo "  Open: ${HTTPS_URL}"
echo "  (not http://${PUBLIC_IP}:3020 — browsers block camera/mic on HTTP IPs)"
echo ""
for _ in $(seq 1 30); do
  if curl -fsSk "https://${SITE_HOST}/health/ready" >/dev/null 2>&1; then
    echo "✓ Health check OK over HTTPS"
    exit 0
  fi
  sleep 3
done
echo "Caddy started — certificate may take a minute. Try: ${HTTPS_URL}" >&2
