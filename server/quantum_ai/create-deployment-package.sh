#!/bin/bash

# Production Deployment Script for CYRUS AI System
# This script creates a production-ready deployment package

echo "🚀 Creating CYRUS Production Deployment Package"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create deployment directory
DEPLOY_DIR="cyrus-deployment-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}[INFO]${NC} Creating deployment package..."

# Copy essential files
cp -r dist/ "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/"
cp railway.toml "$DEPLOY_DIR/"
cp requirements.txt "$DEPLOY_DIR/"
cp .env.example "$DEPLOY_DIR/"
cp README.md "$DEPLOY_DIR/"

# Create production .env template
cat > "$DEPLOY_DIR/.env.production" << 'EOF'
# Production Environment Configuration
# Copy this to .env and configure your production values

# Database - Use a production PostgreSQL instance
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Session Security
SESSION_SECRET=your-very-long-random-secret-here

# AI Configuration - Local AI recommended for independence
USE_LOCAL_LLM=true
USE_LOCAL_VISION=true
USE_LOCAL_IMAGE_GEN=true

# Optional API Keys (only if needed)
# OPENAI_API_KEY=your-key-here
# ELEVENLABS_API_KEY=your-key-here
# GOOGLE_MAPS_API_KEY=your-key-here

# Server Configuration
PORT=5000
NODE_ENV=production
EOF

# Create deployment instructions
cat > "$DEPLOY_DIR/DEPLOYMENT_README.md" << 'EOF'
# CYRUS AI System - Production Deployment

## Quick Deploy Options

### Option 1: Railway (Recommended)
1. Fork/clone this repository to GitHub
2. Connect to Railway: https://railway.app
3. Deploy from your GitHub repository
4. Set environment variables in Railway dashboard
5. Your app will be live at the generated Railway URL

### Option 2: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in this directory
3. Configure environment variables
4. Deploy

### Option 3: Manual Server
1. Upload this package to your server
2. Configure environment variables
3. Run `npm start`

## Environment Variables Required

Copy `.env.production` to `.env` and fill in:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Long random string for sessions
- `USE_LOCAL_LLM=true`: Keep local AI enabled

## Database Setup

You'll need a PostgreSQL database. Railway provides one automatically.

## Post-Deployment

After deployment, your CYRUS system will be available at the generated URL.
EOF

# Create a simple health check script
cat > "$DEPLOY_DIR/health-check.js" << 'EOF'
const https = require('https');

const url = process.argv[2] || 'http://localhost:5000';

console.log(`Checking health of ${url}...`);

const checkHealth = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url + '/health/live', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ status: 'healthy', data });
        } else {
          resolve({ status: 'unhealthy', statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

checkHealth(url)
  .then(result => {
    if (result.status === 'healthy') {
      console.log('✅ System is healthy!');
    } else {
      console.log('❌ System is unhealthy:', result);
    }
  })
  .catch(err => {
    console.log('❌ Health check failed:', err.message);
  });
EOF

# Create package
echo -e "${BLUE}[INFO]${NC} Creating deployment archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"

echo -e "${GREEN}[SUCCESS]${NC} Deployment package created: ${DEPLOY_DIR}.tar.gz"
echo ""
echo -e "${YELLOW}Contents:${NC}"
ls -la "$DEPLOY_DIR"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Extract the deployment package on your server"
echo "2. Configure environment variables (.env file)"
echo "3. Set up PostgreSQL database"
echo "4. Run 'npm start' to launch the system"
echo ""
echo -e "${BLUE}For Railway deployment:${NC}"
echo "- Push this code to GitHub"
echo "- Connect repository to Railway"
echo "- Deploy automatically"