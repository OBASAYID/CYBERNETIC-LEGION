#!/bin/bash
# CYRUS - Fix Hetzner Git Conflicts and Deploy
# Handles local changes on server by stashing and force-updating

set -e

HETZNER_SERVER="${HETZNER_SERVER:-cyrus@167.233.36.99}"
APP_DIR="~/cyrus-ai"

echo "🔧 Fixing Git conflicts on Hetzner server..."
echo "Server: $HETZNER_SERVER"
echo "---"

# Execute deployment commands on remote server
ssh "$HETZNER_SERVER" << 'ENDSSH'
set -e

cd ~/cyrus-ai

echo "📦 Current Git status:"
git status --short | head -20

echo ""
echo "🗂️ Backing up local changes..."
# Create backup of modified files
BACKUP_DIR="backups/pre-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copy modified files to backup
git diff --name-only HEAD | while read file; do
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file" 2>/dev/null || true
  fi
done

# Backup untracked files
for file in \
  "client/src/hooks/useStackLink.ts" \
  "scripts/harden-hetzner-comms.sh" \
  "scripts/test-comms-upload.mjs" \
  "server/config/stack-link.ts" \
  "server/config/system-state.ts" \
  "shared/cyrus-stack-link.ts"; do
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file" 2>/dev/null || true
  fi
done

echo "✅ Backup created at: $BACKUP_DIR"

echo ""
echo "🔄 Resetting to clean state..."
# Stash any local changes
git stash push -u -m "Auto-stash before deploy $(date +%Y%m%d-%H%M%S)" || true

# Remove untracked files that would conflict
git clean -fd

echo ""
echo "📥 Pulling latest code from main-push..."
git fetch origin main-push
git reset --hard origin/main-push

echo ""
echo "📦 Installing dependencies..."
npm install --production=false

echo ""
echo "🏗️ Building application..."
npm run build

echo ""
echo "⚙️ Configuring production environment..."
# Ensure .env has hybrid AI configuration
if ! grep -q "USE_LOCAL_LLM=true" .env 2>/dev/null; then
  echo "# Hybrid AI Configuration (Local + Cloud)" >> .env
  echo "USE_LOCAL_LLM=true" >> .env
  echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
  echo "OLLAMA_MODEL=llama3.1:8b" >> .env
  echo "CYRUS_MULTI_MODEL_STRATEGY=cascade" >> .env
  echo "✅ Hybrid AI configuration added to .env"
else
  echo "✅ Hybrid AI already configured"
fi

echo ""
echo "🔄 Restarting services with Docker Compose..."
docker compose down
docker compose up -d --build --force-recreate app caddy

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "🔍 Checking server health..."
curl -s http://localhost:3020/api/ready || echo "⚠️ Server not responding yet (may need more time)"

echo ""
echo "📝 Recent logs:"
docker compose logs --tail=20 app

echo ""
echo "✅ Deployment finished successfully!"
echo "🌐 Server URL: https://your-domain.com (or http://167.233.36.99:3020)"
echo "📂 Backup location: $BACKUP_DIR"
echo ""
echo "To view logs: docker compose logs -f app"
echo "To check status: docker compose ps"

ENDSSH

echo ""
echo "✅ All done! Your Hetzner server has been updated."
