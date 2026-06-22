#!/bin/bash
# CYRUS - Fix Hetzner Deployment with Mediasoup Dependencies
# Installs build dependencies and completes deployment

set -e

HETZNER_SERVER="${HETZNER_SERVER:-cyrus@167.233.36.99}"

echo "🔧 Installing dependencies and deploying to Hetzner..."
echo "Server: $HETZNER_SERVER"
echo "---"

ssh "$HETZNER_SERVER" << 'ENDSSH'
set -e

cd ~/cyrus-ai

echo "📦 Installing build dependencies for mediasoup..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev build-essential

echo ""
echo "🔄 Installing npm dependencies..."
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
echo "🔄 Restarting Docker services..."
docker compose down
docker compose up -d --build --force-recreate app caddy

echo ""
echo "⏳ Waiting for services to start..."
sleep 15

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "🔍 Checking server health..."
for i in {1..5}; do
  if curl -s http://localhost:3020/api/ready | grep -q "ready"; then
    echo "✅ Server is ready!"
    break
  fi
  echo "⏳ Waiting for server... (attempt $i/5)"
  sleep 5
done

echo ""
echo "📝 Recent application logs:"
docker compose logs --tail=30 app

echo ""
echo "✅ Deployment finished successfully!"
echo "🌐 Your server is running at:"
echo "   - HTTP: http://167.233.36.99:3020"
echo "   - Local: http://localhost:3020"
echo ""
echo "📊 To monitor:"
echo "   docker compose logs -f app"
echo "   docker compose ps"

ENDSSH

echo ""
echo "✅ Hetzner server deployment complete!"
echo "🌐 Access your server at: http://167.233.36.99:3020"
