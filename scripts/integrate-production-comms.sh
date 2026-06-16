#!/usr/bin/env bash
# Wire coturn + TURN env + SFU UDP into the running CYRUS stack (Hetzner / VPS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f docker-compose.yml ]]; then
  echo "Run from repo root (docker-compose.yml missing)" >&2
  exit 1
fi

PUBLIC_IP="${CYRUS_SFU_ANNOUNCED_IP:-${TURN_EXTERNAL_IP:-}}"
if [[ -z "$PUBLIC_IP" ]]; then
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
fi
if [[ -z "$PUBLIC_IP" ]]; then
  echo "Set CYRUS_SFU_ANNOUNCED_IP or TURN_EXTERNAL_IP" >&2
  exit 1
fi

touch .env
if ! grep -q '^TURN_SECRET=' .env 2>/dev/null; then
  echo "TURN_SECRET=$(openssl rand -hex 32)" >> .env
fi
# shellcheck disable=SC1091
set -a
source .env
set +a

upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

upsert_env CYRUS_SFU_ANNOUNCED_IP "$PUBLIC_IP"
upsert_env TURN_EXTERNAL_IP "$PUBLIC_IP"
upsert_env CYRUS_COMM_PUBLIC_TURN "false"
upsert_env CYRUS_SFU_RTC_MIN_PORT "40000"
upsert_env CYRUS_SFU_RTC_MAX_PORT "40100"
upsert_env CYRUS_SFU_WORKER_COUNT "${CYRUS_SFU_WORKER_COUNT:-2}"
upsert_env CYRUS_SFU_MAX_PARTICIPANTS "${CYRUS_SFU_MAX_PARTICIPANTS:-64}"
upsert_env CYRUS_MAX_CONCURRENT_USERS "${CYRUS_MAX_CONCURRENT_USERS:-500000}"
upsert_env TURN_URLS "turn:${PUBLIC_IP}:3478?transport=udp,turn:${PUBLIC_IP}:3478?transport=tcp"

chmod +x deploy/coturn/entrypoint.sh

if ! grep -q 'cyrus-coturn' docker-compose.yml; then
  python3 <<'PY'
from pathlib import Path
compose = Path("docker-compose.yml")
text = compose.read_text()
coturn = '''
  coturn:
    image: coturn/coturn:4.6.2
    container_name: cyrus-coturn
    restart: unless-stopped
    network_mode: host
    env_file:
      - .env
    volumes:
      - ./deploy/coturn/entrypoint.sh:/entrypoint.sh:ro
    entrypoint: ["/bin/sh", "/entrypoint.sh"]

'''
if "coturn:" not in text:
    # insert before app: service
    marker = "\n  app:"
    if marker in text:
        text = text.replace(marker, coturn + marker, 1)
        compose.write_text(text)
        print("Added coturn service to docker-compose.yml")
    else:
        raise SystemExit("Could not find app: service in docker-compose.yml")
PY
fi

if ! grep -q '40000-40100' docker-compose.yml; then
  python3 <<'PY'
from pathlib import Path
p = Path("docker-compose.yml")
text = p.read_text()
needle = '      - "3020:3020"'
insert = needle + '\n      - "40000-40100:40000-40100/udp"'
if needle in text:
    p.write_text(text.replace(needle, insert, 1))
    print("Added SFU UDP ports to app service")
PY
fi

echo "→ Starting coturn..."
docker compose up -d coturn

echo "→ Rebuilding app with TURN env..."
docker compose up -d --build --force-recreate app

echo "→ Waiting for health..."
for _ in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${CYRUS_LIVE_PORT:-3020}/health/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo ""
echo "Comms integration complete."
echo "  Public IP: ${PUBLIC_IP}"
echo "  TURN: turn:${PUBLIC_IP}:3478"
echo "  SFU UDP: 40000-40100"
echo ""
node scripts/verify-comms-stack.mjs || true
