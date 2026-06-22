#!/bin/bash
# CYRUS - Automated GitHub Push & Hetzner Deployment
# This script pushes to GitHub and deploys to your Hetzner server

set -e

echo "🚀 CYRUS - GitHub & Hetzner Deployment"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Hetzner server is configured
if [ -z "$HETZNER_SERVER" ]; then
    echo -e "${YELLOW}⚠️  HETZNER_SERVER environment variable not set${NC}"
    echo ""
    echo "Please set your Hetzner server details:"
    echo "  export HETZNER_SERVER=user@your-server-ip"
    echo ""
    echo "Or run with server as argument:"
    echo "  ./scripts/deploy-to-hetzner.sh user@your-server-ip"
    echo ""
    
    if [ -n "$1" ]; then
        HETZNER_SERVER="$1"
        echo -e "${GREEN}✓ Using server from argument: $HETZNER_SERVER${NC}"
    else
        exit 1
    fi
fi

# Step 1: Push to GitHub
echo -e "${BLUE}📤 Step 1: Pushing to GitHub...${NC}"
echo ""

git fetch new-github
git push --force new-github main-push:main

echo -e "${GREEN}✓ Pushed to GitHub successfully${NC}"
echo ""

# Step 2: Deploy to Hetzner
echo -e "${BLUE}🚢 Step 2: Deploying to Hetzner...${NC}"
echo ""

# SSH into server and deploy
ssh "$HETZNER_SERVER" << 'ENDSSH'
set -e

echo "📥 Pulling latest code from GitHub..."
cd ~/cyrus-ai || { 
    echo "Creating cyrus-ai directory..."
    mkdir -p ~/cyrus-ai
    cd ~/cyrus-ai
    git clone https://github.com/OBASAYID/CYBERNETIC-LEGION.git .
}

# Pull latest changes
git fetch origin
git reset --hard origin/main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building application..."
npm run build

echo "⚙️  Configuring environment..."
# Ensure .env exists with required variables
if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || touch .env
fi

# Update hybrid AI configuration
cat >> .env << 'EOF'

# Hybrid AI Configuration (auto-added by deployment)
USE_LOCAL_LLM=true
OLLAMA_BASE_URL=http://localhost:11434
CYRUS_MULTI_MODEL_STRATEGY=cascade
EOF

echo "🔄 Restarting services..."
# Using PM2 for process management
if command -v pm2 &> /dev/null; then
    pm2 delete cyrus 2>/dev/null || true
    pm2 start npm --name "cyrus" -- start
    pm2 save
else
    echo "⚠️  PM2 not installed. Install with: npm install -g pm2"
    echo "Starting with npm..."
    npm start &
fi

echo "✅ Deployment complete!"
echo ""
echo "🌐 Server should be accessible at your configured URL"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs cyrus"
ENDSSH

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check server status: ssh $HETZNER_SERVER 'pm2 status'"
echo "  2. View logs: ssh $HETZNER_SERVER 'pm2 logs cyrus'"
echo "  3. Visit your Cyrus URL"
echo ""
