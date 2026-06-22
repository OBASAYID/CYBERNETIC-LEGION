#!/usr/bin/env bash
# CYRUS — Build production PWA and deploy mobile shell + server to Hetzner
set -euo pipefail

HETZNER_SERVER="${HETZNER_SERVER:-cyrus@167.233.36.99}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://167-233-36-99.sslip.io}"
GIT_REMOTE="${GIT_REMOTE:-new-github}"
GIT_BRANCH="${GIT_BRANCH:-main-push}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> CYRUS mobile PWA deploy"
echo "    Public URL: $PUBLIC_BASE_URL"
echo "    Server:     $HETZNER_SERVER"

echo "==> Typecheck"
npm run typecheck:all

echo "==> Production build (PWA included)"
NODE_ENV=production npm run build

echo "==> Commit and push (if changes)"
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A
  git status --short
  git commit -m "$(cat <<EOF
Configure mobile PWA shell with production server backend.

Local install caches UI on device; AI, comms, and database stay on Hetzner with minimal API payload transfer.
EOF
)" || true
fi

echo "==> Push to GitHub ($GIT_REMOTE:$GIT_BRANCH -> $DEPLOY_BRANCH)"
git push "$GIT_REMOTE" "${GIT_BRANCH}:${DEPLOY_BRANCH}" || git push "$GIT_REMOTE" "${GIT_BRANCH}:${DEPLOY_BRANCH}" --force

echo "==> Deploy on Hetzner"
ssh "$HETZNER_SERVER" bash -s <<ENDSSH
set -euo pipefail
cd ~/cyrus-ai

git fetch origin
git reset --hard "origin/${DEPLOY_BRANCH}"

# Ensure production mobile env
grep -q '^PUBLIC_BASE_URL=' .env 2>/dev/null && \
  sed -i 's|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=${PUBLIC_BASE_URL}|' .env || \
  echo "PUBLIC_BASE_URL=${PUBLIC_BASE_URL}" >> .env

docker compose -f docker-compose.production.yml pull redis postgres 2>/dev/null || true
docker compose -f docker-compose.production.yml up -d --build --force-recreate app caddy

echo "==> Health check"
sleep 8
curl -fsS "${PUBLIC_BASE_URL}/api/ready" | head -c 200 || curl -fsS "http://127.0.0.1:3020/api/ready" | head -c 200
echo ""
curl -fsS "${PUBLIC_BASE_URL}/api/stack/mobile" | head -c 400 || curl -fsS "http://127.0.0.1:3020/api/stack/mobile" | head -c 400
echo ""
ENDSSH

echo "==> Done. Install on mobile: $PUBLIC_BASE_URL"
