# CYRUS v3.0 - Standalone Deployment Guide

## Cybernetic Yielding Robust Unified System
### OMEGA-TIER Quantum Artificial Intelligence

---

## Prerequisites

| Requirement | Minimum Version | Purpose |
|-------------|----------------|---------|
| Node.js | 18+ (20 recommended) | Server runtime |
| npm | 9+ | Package manager |
| Python | 3.10+ | Quantum AI Core, ML services |
| PostgreSQL | 15+ | Database (local, Docker, or hosted) |

---

## Option 1: Docker Compose (Recommended)

Everything runs in containers. No local installs needed besides Docker.

```bash
# 1. Configure environment
cp standalone/.env.example standalone/.env

# 2. Edit .env - set at minimum:
#    OPENAI_API_KEY=sk-your-key-here

# 3. Launch everything (PostgreSQL + schema + CYRUS)
cd standalone
docker compose up -d

# 4. Check status
docker compose ps
docker compose logs -f cyrus
```

CYRUS will be available at **http://localhost:5000**

### Docker Compose Commands

```bash
cd standalone

docker compose up -d          # Start all services
docker compose down            # Stop all services
docker compose down -v         # Stop and delete all data
docker compose logs -f cyrus   # Stream CYRUS logs
docker compose restart cyrus   # Restart CYRUS only
docker compose ps              # Check service status
```

---

## Option 2: Manual Installation

### Step 1: Run the Installer

```bash
bash standalone/install.sh
```

This will:
- Verify Node.js, npm, and Python are installed
- Create `.env` from the template
- Install all Node.js and Python dependencies
- Build the frontend
- Attempt to push the database schema

### Step 2: Configure Environment

Edit `.env` in the project root:

```bash
# REQUIRED
DATABASE_URL=postgresql://user:password@localhost:5432/cyrus
OPENAI_API_KEY=sk-your-key-here

# OPTIONAL
ELEVENLABS_API_KEY=           # Voice synthesis
GOOGLE_MAPS_API_KEY=          # Navigation features
GOOGLE_GEOCODING_API_KEY=     # Location services
GOOGLE_GEOLOCATION_API_KEY=   # Geolocation
NEWS_API_KEY=                 # News intelligence
```

### Step 3: Set Up PostgreSQL

**Option A - Docker (easiest)**
```bash
cd standalone && docker compose up -d postgres
```

**Option B - Local PostgreSQL**
```bash
createdb cyrus
```

**Option C - Hosted**
Use Neon, Supabase, Railway, or any PostgreSQL provider.
Set the connection URL in `DATABASE_URL`.

### Step 4: Push Database Schema

```bash
npx drizzle-kit push
```

### Step 5: Launch CYRUS

```bash
npm run start:standalone
```

CYRUS will be available at **http://localhost:5000**

---

## Authentication

Outside of Replit, CYRUS uses built-in access code authentication:

| Role | Username | Access Code |
|------|----------|-------------|
| Admin | DELTA UNIFORM 00 | 71580019 |
| User | Any username | 170392 |

Customize in `.env`:
```
ADMIN_USERNAME=your-admin-name
ADMIN_ACCESS_CODE=your-admin-code
USER_ACCESS_CODE=your-user-code
```

---

## Production Deployment (VPS / Cloud VM)

### 1. Server Setup

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 python3-venv postgresql

# Clone project
git clone <your-repo> /opt/cyrus
cd /opt/cyrus

# Install
bash standalone/install.sh
```

### 2. Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

The WebSocket upgrade headers are essential for Socket.IO (NEXUS COMMS real-time features).

### 3. Process Manager (systemd)

Create `/etc/systemd/system/cyrus.service`:

```ini
[Unit]
Description=CYRUS v3.0 Humanoid AI System
After=network.target postgresql.service

[Service]
Type=simple
User=cyrus
WorkingDirectory=/opt/cyrus
EnvironmentFile=/opt/cyrus/.env
ExecStart=/usr/bin/bash /opt/cyrus/standalone/start.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cyrus
sudo systemctl start cyrus
sudo journalctl -u cyrus -f    # View logs
```

---

## Architecture

```
Port 5000 ─ CYRUS Main Server (Express.js + React frontend)
Port 5001 ─ Quantum AI Bridge (Python Flask)
Port 5002 ─ Comms ML Intelligence Service (Python Flask)
```

All three services are started automatically by `start.sh` or the Docker CMD.

---

## Troubleshooting

### Cannot connect to database
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify connection string format
# postgresql://user:password@host:5432/dbname
```

### Port 5000 already in use
```bash
lsof -i :5000
kill -9 <PID>
```

### Frontend shows blank page
```bash
# Rebuild frontend
npm run build

# Verify output exists
ls dist/public/index.html
```

### Python services not starting
```bash
source .venv/bin/activate
pip install numpy scipy scikit-learn networkx matplotlib pandas mmh3 nltk flask

# Test manually
python3 server/quantum_ai/quantum_bridge.py
python3 server/comms/ml_service.py
```

### Health check endpoints
```
GET /           - Main page (200 when ready)
GET /__health   - Quick health check
GET /health/live  - Liveness probe
GET /health/ready - Readiness probe
```
