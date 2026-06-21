# CYRUS - Complete Setup & Deployment Guide

## 🎯 Overview

Cyrus is now the world's most advanced AI system with complete independence, self-evolution, multi-model intelligence, voice capabilities, and personalized learning.

---

## 📦 Quick Start (3 Options)

### Option 1: Fully Independent (Local-Only, Zero Cost)

```bash
# 1. Install and configure local LLM
./scripts/setup-local-llm.sh

# 2. Configure environment
cat >> .env <<EOF
USE_LOCAL_LLM=true
OLLAMA_BASE_URL=http://localhost:11434
EOF

# 3. Install dependencies and start
npm install
npm run dev

# 4. Access Cyrus
# Open http://localhost:3020
```

**Features Available:**
- ✅ Complete AI intelligence (local models)
- ✅ Self-evolution capabilities
- ✅ Document intelligence
- ✅ Real-time communication
- ✅ Personalized learning
- ❌ Cloud AI models (GPT-4, Claude, etc.)
- ❌ Advanced voice (requires API keys)

**Cost:** $0/month
**Internet:** Optional (for updates only)

---

### Option 2: Maximum Intelligence (All Features)

```bash
# 1. Configure all API keys
cat >> .env <<EOF
# OpenAI (GPT-4, Whisper STT, TTS)
OPENAI_API_KEY=sk-...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Google (Gemini)
GOOGLE_AI_API_KEY=...

# xAI (Grok) - optional
XAI_API_KEY=...

# ElevenLabs (Premium Voice) - optional
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Local LLM (backup/offline mode)
USE_LOCAL_LLM=true
CYRUS_MULTI_MODEL_STRATEGY=specialized
EOF

# 2. Setup local models (fallback)
./scripts/setup-local-llm.sh

# 3. Install and start
npm install
npm run dev

# 4. Access Cyrus
# Open http://localhost:3020
```

**Features Available:**
- ✅ Complete AI intelligence (local + cloud)
- ✅ Multi-model synthesis (GPT-4 + Claude + Gemini + Grok)
- ✅ Self-evolution capabilities
- ✅ Advanced voice (Whisper + ElevenLabs/OpenAI)
- ✅ Document intelligence
- ✅ Real-time communication
- ✅ Personalized learning

**Cost:** Variable (pay-per-use for cloud APIs)
**Internet:** Required for cloud features

---

### Option 3: Hybrid (Recommended)

Best balance of cost and capability.

```bash
# 1. Configure essential API keys only
cat >> .env <<EOF
# OpenAI for backup and voice
OPENAI_API_KEY=sk-...

# Local LLM for most queries
USE_LOCAL_LLM=true
CYRUS_MULTI_MODEL_STRATEGY=cascade
EOF

# 2. Setup local models
./scripts/setup-local-llm.sh

# 3. Install and start
npm install
npm run dev
```

**Strategy:** Uses local LLM for 90% of queries, falls back to cloud for complex tasks.
**Cost:** ~$10-20/month (minimal cloud usage)

---

## 🔧 Environment Configuration

### Complete .env Template

```bash
# ==========================================
# CYRUS CORE CONFIGURATION
# ==========================================

# Server
PORT=3020
CYRUS_LIVE_PORT=3020
NODE_ENV=production
PUBLIC_BASE_URL=https://your-domain.com

# Database (required for production)
DATABASE_URL=postgresql://user:pass@localhost:5432/cyrus
CYRUS_SESSION_STORE=postgresql

# ==========================================
# LOCAL AI (Independence)
# ==========================================

USE_LOCAL_LLM=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=cyrus-general
OLLAMA_CODE_MODEL=cyrus-code
OLLAMA_MEDICAL_MODEL=cyrus-medical
OLLAMA_LEGAL_MODEL=cyrus-legal

# ==========================================
# CLOUD AI PROVIDERS (Optional)
# ==========================================

# OpenAI (GPT-4, Whisper, TTS)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google (Gemini)
GOOGLE_AI_API_KEY=...
GOOGLE_MODEL=gemini-2.0-flash-exp

# xAI (Grok) - optional
XAI_API_KEY=...
XAI_MODEL=grok-beta

# Multi-Model Strategy
# Options: parallel, cascade, voting, specialized
CYRUS_MULTI_MODEL_STRATEGY=specialized

# ==========================================
# VOICE CAPABILITIES
# ==========================================

# Speech-to-Text (Whisper)
# Uses OPENAI_API_KEY above

# Text-to-Speech (ElevenLabs - Best Quality)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Alternative TTS: Azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=...

# Alternative TTS: Google Cloud
GOOGLE_CLOUD_API_KEY=...

# ==========================================
# COMMUNICATION & NETWORKING
# ==========================================

# File Upload Limits
CYRUS_COMMS_MAX_UPLOAD_BYTES=2147483648  # 2GB
CYRUS_COMMS_CHUNK_BYTES=16777216         # 16MB chunks

# WebRTC / Calls
TURN_URLS=turn:your-turn-server:3478
CYRUS_SFU_ANNOUNCED_IP=your-public-ip
CYRUS_SFU_RTC_MIN_PORT=40000
CYRUS_SFU_RTC_MAX_PORT=49999

# Redis (optional, for scaling)
REDIS_URL=redis://localhost:6379

# ==========================================
# SECURITY & AUTH
# ==========================================

# Session Secret
SESSION_SECRET=your-secure-random-string

# Admin Access (for self-evolution)
# Set x-user-id: admin and x-admin: true in requests

# ==========================================
# OPTIONAL INTEGRATIONS
# ==========================================

# Sidecar AI Services
CYRUS_AI_URL=http://localhost:3001
COMMS_ML_URL=http://localhost:3002
```

---

## 🚀 Deployment Options

### Local Development

```bash
npm run dev
# Open http://localhost:3020
```

### Production (Node.js)

```bash
# 1. Build
npm run build

# 2. Start production server
npm start

# 3. Access at configured PUBLIC_BASE_URL
```

### Production (Docker)

```bash
# 1. Build image
docker build -t cyrus-ai .

# 2. Run with environment file
docker run -d \
  --name cyrus \
  -p 3020:3020 \
  --env-file .env \
  -v ./data:/app/data \
  cyrus-ai

# 3. Check logs
docker logs -f cyrus
```

### Production (Docker Compose)

```bash
# 1. Configure docker-compose.production.yml
# 2. Start all services
docker-compose -f docker-compose.production.yml up -d

# 3. Check status
docker-compose -f docker-compose.production.yml ps
```

### Cloud Deployment (Hetzner)

```bash
# 1. Configure deployment script
nano scripts/harden-hetzner-comms.sh

# 2. Deploy to server
./scripts/harden-hetzner-comms.sh

# 3. Verify deployment
curl https://your-domain.com/api/cyrus/health
```

---

## 📝 Initial Setup Steps

### 1. Install Cyrus

```bash
git clone <your-repo>
cd cyrus-part2-assets-fullzip
npm install
```

### 2. Setup Local AI (Recommended)

```bash
chmod +x scripts/setup-local-llm.sh
./scripts/setup-local-llm.sh
```

This will:
- Install Ollama
- Download AI models (Llama 3.x, CodeLlama, LLaVA)
- Create custom Cyrus models
- Configure environment

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
# Add your configuration
```

### 4. Setup Database (Production)

```bash
# PostgreSQL for sessions and data
createdb cyrus
psql cyrus < schema.sql
```

### 5. Start Cyrus

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

### 6. Verify Installation

```bash
# Check system status
curl http://localhost:3020/api/cyrus/status

# Expected response:
{
  "success": true,
  "status": "operational",
  "systems": {
    "local-llm": true,
    "multi-model": true,
    "voice-stt": true,
    "voice-tts": true,
    "learning": true,
    "evolution": true
  },
  "capabilities": [
    "Local AI Processing",
    "Multi-Model Intelligence",
    "Speech Recognition",
    "Speech Synthesis",
    "Personalized Learning",
    "Self-Evolution"
  ]
}
```

---

## 🎮 Using Cyrus

### Web Interface

Navigate to `http://localhost:3020` and access:

- **Dashboard** - Overview and statistics
- **Chat** - Intelligent conversations
- **Voice** - Voice interaction
- **Documents** - Document intelligence
- **Comms** - Real-time communication
- **Evolution** - Admin self-evolution (admin only)

### API Usage

#### Unified Query

```bash
curl -X POST http://localhost:3020/api/cyrus/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "query": "Explain quantum computing",
    "mode": "chat"
  }'
```

#### Voice Interaction

```bash
# Speech to text
curl -X POST http://localhost:3020/api/voice/speech-to-text \
  -H "x-user-id: user123" \
  -F "audio=@recording.webm"

# Text to speech
curl -X POST http://localhost:3020/api/voice/text-to-speech \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{"text": "Hello, I am Cyrus"}' \
  --output speech.mp3
```

#### Self-Evolution (Admin Only)

```bash
# Request evolution
curl -X POST http://localhost:3020/api/evolution/request \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin" \
  -H "x-admin: true" \
  -d '{
    "intent": "Optimize document processing",
    "evolutionType": "optimize",
    "description": "Make document intelligence 10x faster"
  }'

# Review plan and execute
curl -X POST http://localhost:3020/api/evolution/<evolution-id>/execute \
  -H "x-user-id: admin" \
  -H "x-admin: true"
```

#### Learning System

```bash
# Get personalized response
curl -X POST http://localhost:3020/api/learning/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "query": "How do I learn machine learning?"
  }'

# View learning progress
curl http://localhost:3020/api/learning/stats \
  -H "x-user-id: user123"
```

---

## 🔍 Monitoring & Maintenance

### System Health

```bash
# Health check
curl http://localhost:3020/api/cyrus/health

# Detailed status
curl http://localhost:3020/api/cyrus/status

# Capabilities
curl http://localhost:3020/api/cyrus/capabilities
```

### Logs

```bash
# Development logs
npm run dev

# Production logs (PM2)
pm2 logs cyrus

# Docker logs
docker logs -f cyrus
```

### Backups

Evolution backups are stored in `.cyrus-evolution-backups/`
User learning data in `.cyrus-learning/`

```bash
# Backup important data
tar -czf cyrus-backup-$(date +%Y%m%d).tar.gz \
  .cyrus-evolution-backups \
  .cyrus-learning \
  .env \
  data/
```

---

## 🛠️ Troubleshooting

### Local LLM Not Working

```bash
# Check Ollama service
ollama list

# Restart Ollama
pkill ollama
ollama serve &

# Test model
ollama run cyrus-general "Test query"
```

### Voice Features Not Available

```bash
# Check API keys
echo $OPENAI_API_KEY
echo $ELEVENLABS_API_KEY

# Test voice endpoint
curl http://localhost:3020/api/voice/capabilities
```

### Self-Evolution Failing

```bash
# Check admin permissions
# Ensure x-user-id: admin and x-admin: true

# Check evolution status
curl http://localhost:3020/api/evolution/status \
  -H "x-user-id: admin" \
  -H "x-admin: true"

# View evolution history
curl "http://localhost:3020/api/evolution/history/list?limit=10" \
  -H "x-user-id: admin" \
  -H "x-admin: true"
```

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check session store
curl http://localhost:3020/api/auth/user
```

---

## 📊 Performance Optimization

### Local LLM Performance

- **CPU:** 4+ cores recommended
- **RAM:** 16GB+ for large models
- **GPU:** Optional but significantly faster (NVIDIA with CUDA)

```bash
# Use smaller models for faster inference
OLLAMA_MODEL=llama3.2:3b  # Fast (3B params)
# vs
OLLAMA_MODEL=llama3.1:8b  # Slower but smarter (8B params)
```

### Cloud API Optimization

```bash
# Use cascade strategy to minimize costs
CYRUS_MULTI_MODEL_STRATEGY=cascade

# Route to cheaper models when possible
OPENAI_MODEL=gpt-4o-mini  # Cheaper
# vs
OPENAI_MODEL=gpt-4o  # More expensive but higher quality
```

---

## 🔐 Security Considerations

1. **Admin Access:** Restrict self-evolution to trusted admins only
2. **API Keys:** Keep all API keys secure in `.env`, never commit to git
3. **Database:** Use strong passwords and encrypted connections
4. **HTTPS:** Always use HTTPS in production
5. **Session Secret:** Use strong random session secret
6. **Backups:** Regular backups of evolution and learning data

---

## 📚 Additional Resources

- **Full Documentation:** `CYRUS_ULTIMATE_SYSTEM.md`
- **Document Intelligence:** `DOCUMENT_INTELLIGENCE.md`
- **API Reference:** See route files in `server/ai/`
- **Agent Guide:** `AGENTS.md`

---

## 🎉 You're Ready!

Cyrus is now fully configured and ready to use. You have:

- ✅ Local AI independence
- ✅ Multi-model cloud intelligence
- ✅ Self-evolution capabilities
- ✅ Advanced voice interaction
- ✅ Personalized learning
- ✅ Complete communication suite

**Next Steps:**
1. Test the system: `curl http://localhost:3020/api/cyrus/health`
2. Open web interface: `http://localhost:3020`
3. Try voice features
4. Explore self-evolution (as admin)
5. Start building amazing AI applications!

Welcome to the future. Welcome to Cyrus.
