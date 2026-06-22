#!/bin/bash
# CYRUS - Deploy to Hetzner (No Sudo Required)
# Uses star relay fallback for group calls instead of mediasoup SFU

set -e

HETZNER_SERVER="${HETZNER_SERVER:-cyrus@167.233.36.99}"

echo "🚀 Deploying CYRUS to Hetzner (without mediasoup SFU)..."
echo "Server: $HETZNER_SERVER"
echo "---"

ssh "$HETZNER_SERVER" << 'ENDSSH'
set -e

cd ~/cyrus-ai

echo "📦 Installing dependencies (skipping mediasoup)..."
# Install without optional dependencies to skip mediasoup
npm install --production=false --no-optional || {
  echo "⚠️ Some optional packages failed (mediasoup), continuing..."
  npm install --production=false --force
}

echo ""
echo "🏗️ Building application..."
npm run build

echo ""
echo "⚙️ Configuring production environment..."
# Ensure .env has required configuration
ENV_FILE=".env"

# Hybrid AI Configuration
if ! grep -q "USE_LOCAL_LLM" "$ENV_FILE" 2>/dev/null; then
  cat >> "$ENV_FILE" << 'EOF'

# Hybrid AI Configuration (Local + Cloud)
USE_LOCAL_LLM=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
CYRUS_MULTI_MODEL_STRATEGY=cascade

# Production Settings
NODE_ENV=production
CYRUS_SESSION_STORE=memory

EOF
  echo "✅ Hybrid AI configuration added"
else
  echo "✅ Configuration already present"
fi

echo ""
echo "🔄 Restarting Docker services..."
docker compose down
docker compose up -d --build --force-recreate app caddy

echo ""
echo "⏳ Waiting for services to start..."
sleep 20

echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "🔍 Checking server health..."
for i in {1..10}; do
  RESPONSE=$(curl -s http://localhost:3020/api/ready 2>/dev/null || echo "")
  if echo "$RESPONSE" | grep -q "ready"; then
    echo "✅ Server is ready and responding!"
    echo "$RESPONSE"
    break
  fi
  echo "⏳ Waiting for server... (attempt $i/10)"
  sleep 5
done

echo ""
echo "📝 Recent application logs:"
docker compose logs --tail=50 app | grep -E "listening|initialized|ready|error" || docker compose logs --tail=20 app

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access Points:"
echo "   HTTP: http://167.233.36.99:3020"
echo "   Local: http://localhost:3020"
echo ""
echo "📊 Monitoring Commands:"
echo "   docker compose logs -f app        # Follow logs"
echo "   docker compose ps                  # Service status"
echo "   curl http://localhost:3020/api/ready  # Health check"
echo ""
echo "ℹ️ Note: Group calls use star relay (mediasoup SFU not built)"

ENDSSH

echo ""
echo "✅ Deployment to Hetzner complete!"
echo "🌐 Your server: http://167.233.36.99:3020"
