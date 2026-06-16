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
sed "s/\\{\$SITE_HOST\\}/${SITE_HOST}/g" deploy/caddy/Caddyfile > deploy/caddy/Caddyfile.generated

if ! grep -q 'cyrus-caddy' docker-compose.yml 2>/dev/null; then
  python3 <<'PY'
from pathlib import Path
compose = Path("docker-compose.yml")
text = compose.read_text()
caddy = '''
  caddy:
    image: caddy:2-alpine
    container_name: cyrus-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/caddy/Caddyfile.generated:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    networks:
      - cyrus-network

'''
if "caddy:" not in text:
    marker = "\n  coturn:"
    if marker not in text:
        marker = "\n  app:"
    text = text.replace(marker, caddy + marker, 1)
    if "caddy_data:" not in text:
        text = text.rstrip() + "\n  caddy_data:\n  caddy_config:\n"
    compose.write_text(text)
    print("Added caddy service to docker-compose.yml")
PY
fi

touch .env
upsert() {
  local k="$1" v="$2"
  if grep -q "^${k}=" .env; then sed -i.bak "s|^${k}=.*|${k}=${v}|" .env; else echo "${k}=${v}" >> .env; fi
}
upsert PUBLIC_BASE_URL "$HTTPS_URL"
upsert BASE_URL "$HTTPS_URL"
upsert CYRUS_HTTPS_HOST "$SITE_HOST"

docker compose up -d caddy
docker compose up -d --force-recreate app

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
