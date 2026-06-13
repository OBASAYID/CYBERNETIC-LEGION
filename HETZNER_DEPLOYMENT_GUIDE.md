# CYRUS AI - Hetzner VPS Deployment Guide

Complete guide for deploying CYRUS AI to Hetzner Cloud.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Selection & Setup](#server-selection--setup)
3. [Initial Server Configuration](#initial-server-configuration)
4. [Application Deployment](#application-deployment)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [Database Configuration](#database-configuration)
7. [WebRTC/TURN Setup](#webrtcturn-setup)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Hetzner Account
- Sign up at https://www.hetzner.com/cloud
- Add payment method
- Generate API token (optional, for automation)

### 2. Domain Name
- Purchase a domain (e.g., from Namecheap, Cloudflare, etc.)
- You'll need to point it to your Hetzner server

### 3. Local Requirements
- SSH client
- Git installed locally
- Node.js 22+ (for local testing)

---

## Server Selection & Setup

### Recommended Server Specs

**For Development/Testing:**
- **CPX21**: 3 vCPU, 4GB RAM, 80GB SSD - €7.49/month
- Good for: Testing, low traffic (< 50 concurrent users)

**For Production (Recommended):**
- **CPX31**: 4 vCPU, 8GB RAM, 160GB SSD - €11.90/month
- Good for: Production, 100-500 concurrent users

**For High Traffic:**
- **CPX41**: 8 vCPU, 16GB RAM, 240GB SSD - €22.90/month
- Good for: High traffic, 500+ concurrent users

### Creating Your Server

1. **Log in to Hetzner Cloud Console**
   - Go to https://console.hetzner.cloud/

2. **Create New Project**
   - Name: `cyrus-ai-production`

3. **Add Server**
   - **Location**: Nuremberg, Germany (best EU connectivity) or Falkenstein
   - **Image**: Ubuntu 22.04 LTS
   - **Type**: CPX31 (recommended)
   - **Networking**: 
     - ✅ IPv4
     - ✅ IPv6 (optional)
   - **SSH Key**: 
     - Add your SSH public key (create one if needed)
     - `ssh-keygen -t ed25519 -C "your_email@example.com"`
   - **Backups**: Enable (adds 20% cost, highly recommended)
   - **Name**: `cyrus-ai-prod-01`

4. **Create Server** and note the IP address

### Initial DNS Setup

Point your domain to the server:

```dns
A     @              <YOUR_SERVER_IP>
A     www            <YOUR_SERVER_IP>
AAAA  @              <YOUR_IPv6_ADDRESS>  (if using IPv6)
```

Wait for DNS propagation (5-30 minutes).

---

## Initial Server Configuration

### 1. Connect to Your Server

```bash
ssh root@<YOUR_SERVER_IP>
```

### 2. Update System

```bash
apt update && apt upgrade -y
apt install -y curl wget git vim ufw fail2ban
```

### 3. Create Non-Root User

```bash
# Create user
adduser cyrus
usermod -aG sudo cyrus

# Copy SSH keys
mkdir -p /home/cyrus/.ssh
cp ~/.ssh/authorized_keys /home/cyrus/.ssh/
chown -R cyrus:cyrus /home/cyrus/.ssh
chmod 700 /home/cyrus/.ssh
chmod 600 /home/cyrus/.ssh/authorized_keys

# Test login (in new terminal)
# ssh cyrus@<YOUR_SERVER_IP>
```

### 4. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Allow WebRTC ports (UDP for media)
ufw allow 10000:20000/udp

# Enable firewall
ufw --force enable
ufw status
```

### 5. Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker cyrus

# Install Docker Compose
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 6. Install Node.js 22

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should be v22.x
npm --version
```

---

## Application Deployment

### Method 1: Docker Deployment (Recommended)

#### 1. Create Deployment Directory

```bash
# As cyrus user
su - cyrus
mkdir -p ~/cyrus-ai
cd ~/cyrus-ai
```

#### 2. Clone Repository

```bash
# If using GitHub (replace with your repo URL)
git clone https://github.com/OBASAYID/CYBERNETIC-LEGION.git .

# Or upload via SCP from local machine
# scp -r /path/to/cyrus-part2-assets-fullzip/* cyrus@<SERVER_IP>:~/cyrus-ai/
```

#### 3. Create Docker Compose File

```bash
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: cyrus-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: cyrus_ai
      POSTGRES_USER: cyrus
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - cyrus-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cyrus"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: cyrus-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - cyrus-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cyrus-app
    restart: unless-stopped
    ports:
      - "3020:3020"
    environment:
      NODE_ENV: production
      PORT: 3020
      CYRUS_LIVE_PORT: 3020
      DATABASE_URL: postgresql://cyrus:${POSTGRES_PASSWORD}@postgres:5432/cyrus_ai
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      CYRUS_SESSION_STORE: postgresql
      PUBLIC_BASE_URL: https://${DOMAIN}
      BASE_URL: https://${DOMAIN}
      # Add your other environment variables here
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - cyrus-network
    volumes:
      - app_uploads:/app/uploads
      - app_logs:/app/logs

  nginx:
    image: nginx:alpine
    container_name: cyrus-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - certbot_www:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
    depends_on:
      - app
    networks:
      - cyrus-network

  certbot:
    image: certbot/certbot:latest
    container_name: cyrus-certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  cyrus-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  app_uploads:
  app_logs:
  certbot_www:
  certbot_conf:
EOF
```

#### 4. Create Dockerfile

```bash
cat > Dockerfile <<'EOF'
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    tini

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3020

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3020/api/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/server/index.js"]
EOF
```

#### 5. Create Nginx Configuration

```bash
mkdir -p ssl

cat > nginx.conf <<'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;

    # Upstream
    upstream cyrus_app {
        server app:3020;
        keepalive 32;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        listen [::]:80;
        server_name _;

        # Certbot challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect all other traffic to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name _;

        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # WebSocket upgrade headers
        map $http_upgrade $connection_upgrade {
            default upgrade;
            '' close;
        }

        # Main application
        location / {
            limit_req zone=general_limit burst=50 nodelay;
            
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Port $server_port;
            
            # Timeouts for long-running requests
            proxy_connect_timeout 60s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
            
            # Buffering
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }

        # WebSocket endpoint (Socket.IO)
        location /socket.io/ {
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Long timeout for WebSocket
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }

        # WebSocket signaling endpoint
        location /ws {
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Long timeout for WebSocket
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }

        # API endpoints with rate limiting
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # Health check (no rate limiting)
        location /api/health {
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            access_log off;
        }

        # Static assets with caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
```

#### 6. Create Environment File

```bash
cat > .env <<'EOF'
# Server Configuration
NODE_ENV=production
PORT=3020
CYRUS_LIVE_PORT=3020

# Domain
DOMAIN=your-domain.com

# Database
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DATABASE_URL=postgresql://cyrus:CHANGE_THIS_STRONG_PASSWORD@postgres:5432/cyrus_ai

# Redis
REDIS_PASSWORD=CHANGE_THIS_STRONG_REDIS_PASSWORD
REDIS_URL=redis://:CHANGE_THIS_STRONG_REDIS_PASSWORD@redis:6379

# Session Store
CYRUS_SESSION_STORE=postgresql
SESSION_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING

# Public URLs
PUBLIC_BASE_URL=https://your-domain.com
BASE_URL=https://your-domain.com

# Azure OpenAI (if using)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment

# Azure Document Intelligence (if using)
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your-key

# TURN Server (for WebRTC)
# Option 1: Use free STUN (limited)
# Option 2: Set up your own TURN server (see WebRTC section)
# Option 3: Use managed service like Twilio

# Optional: TURN credentials
# TURN_URLS=turn:your-turn-server.com:3478
# TURN_USERNAME=username
# TURN_PASSWORD=password

# Security
# Generate: openssl rand -base64 64
CYRUS_COMM_WS_TOKEN=optional_websocket_security_token

# Logging
LOG_LEVEL=info

# Feature Flags
CYRUS_SINGLE_ORIGIN=1
CYRUS_UI_ROOT=cyrus-ui
EOF
```

**IMPORTANT:** Edit `.env` and change all passwords and secrets!

```bash
# Generate secure passwords
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD
openssl rand -base64 64  # For SESSION_SECRET
```

#### 7. Set Up SSL Certificate

```bash
# Replace YOUR_DOMAIN and YOUR_EMAIL
export DOMAIN=your-domain.com
export EMAIL=your-email@example.com

# Update domain in nginx.conf
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx.conf

# Get initial certificate
docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN
```

#### 8. Build and Deploy

```bash
# Build and start all services
docker compose up -d --build

# Check logs
docker compose logs -f app

# Check status
docker compose ps
```

#### 9. Verify Deployment

```bash
# Check app health
curl http://localhost:3020/api/health

# Check via domain (after SSL setup)
curl https://your-domain.com/api/health
```

### Method 2: Direct Node.js Deployment

If you prefer not to use Docker:

```bash
# As cyrus user
cd ~/cyrus-ai

# Install dependencies
npm install

# Build application
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'cyrus-ai',
    script: 'dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3020,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## Database Configuration

### Initialize Database Schema

If using Drizzle ORM:

```bash
# Run migrations
docker compose exec app npm run db:migrate

# Or if using direct deployment
npm run db:migrate
```

### Database Backup Setup

```bash
# Create backup script
cat > ~/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/home/cyrus/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cyrus_db_$DATE.sql"

mkdir -p $BACKUP_DIR

# Backup
docker compose exec -T postgres pg_dump -U cyrus cyrus_ai > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOF

chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/cyrus/backup-db.sh") | crontab -
```

---

## WebRTC/TURN Setup

For production WebRTC calls, you need a TURN server.

### Option 1: Use Coturn (Self-Hosted TURN Server)

```bash
# Install coturn
sudo apt install -y coturn

# Edit configuration
sudo vim /etc/turnserver.conf
```

Add to `/etc/turnserver.conf`:

```conf
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_SECRET_KEY_HERE
realm=your-domain.com
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/your-domain.com/fullchain.pem
pkey=/etc/letsencrypt/live/your-domain.com/privkey.pem
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384"
no-stdout-log
log-file=/var/log/turnserver.log
```

```bash
# Enable and start coturn
sudo systemctl enable coturn
sudo systemctl start coturn

# Open firewall for TURN
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 49152:65535/udp

# Test TURN server
# Use online tool: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
```

### Option 2: Use Managed TURN Service

Services like:
- **Twilio TURN** (pay-as-you-go)
- **Xirsys** (dedicated TURN)
- **Metered.ca** (free tier available)

Add credentials to your `.env`:

```env
TURN_URLS=turn:global.turn.twilio.com:3478?transport=udp
TURN_USERNAME=your-username
TURN_PASSWORD=your-password
```

---

## Monitoring & Maintenance

### 1. Set Up Log Rotation

```bash
sudo tee /etc/logrotate.d/cyrus-ai <<'EOF'
/home/cyrus/cyrus-ai/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 cyrus cyrus
    sharedscripts
    postrotate
        docker compose -f /home/cyrus/cyrus-ai/docker-compose.yml exec app kill -USR1 1 || true
    endscript
}
EOF
```

### 2. Set Up Monitoring

Install Netdata for real-time monitoring:

```bash
# Install Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait

# Access at: http://your-server-ip:19999
# Secure it with password or firewall
```

### 3. Set Up Alerts

Create uptime monitoring:

```bash
cat > ~/check-app.sh <<'EOF'
#!/bin/bash
if ! curl -f http://localhost:3020/api/health > /dev/null 2>&1; then
    echo "CYRUS AI is down! Restarting..." | mail -s "CYRUS AI Alert" your-email@example.com
    cd /home/cyrus/cyrus-ai
    docker compose restart app
fi
EOF

chmod +x ~/check-app.sh

# Add to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/cyrus/check-app.sh") | crontab -
```

### 4. Update Script

```bash
cat > ~/update-app.sh <<'EOF'
#!/bin/bash
cd /home/cyrus/cyrus-ai

echo "Pulling latest code..."
git pull

echo "Rebuilding application..."
docker compose up -d --build

echo "Update complete!"
docker compose logs -f --tail=100 app
EOF

chmod +x ~/update-app.sh
```

---

## Troubleshooting

### Check Application Logs

```bash
# All services
docker compose logs -f

# Just the app
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100 app
```

### Check Service Status

```bash
docker compose ps
docker compose exec app npm run health:check
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart app
docker compose restart postgres
```

### Database Issues

```bash
# Access PostgreSQL
docker compose exec postgres psql -U cyrus cyrus_ai

# Check connections
docker compose exec postgres psql -U cyrus -c "SELECT * FROM pg_stat_activity;"

# Restart database
docker compose restart postgres
```

### Certificate Issues

```bash
# Renew certificates manually
docker compose run --rm certbot renew

# Check certificate expiry
openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -dates
```

### High Memory Usage

```bash
# Check memory
free -h
docker stats

# Restart app if needed
docker compose restart app
```

### Performance Issues

```bash
# Check CPU and disk
top
df -h
iostat

# Check network
iftop  # Install: apt install iftop
```

---

## Quick Reference Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart app
docker compose restart app

# Update and rebuild
git pull && docker compose up -d --build

# Backup database
~/backup-db.sh

# Check health
curl http://localhost:3020/api/health

# Access database
docker compose exec postgres psql -U cyrus cyrus_ai

# Check disk space
df -h

# Check memory
free -h

# View running containers
docker compose ps
```

---

## Security Checklist

- [✓] SSH key authentication only (disable password auth)
- [✓] Firewall enabled (ufw)
- [✓] Fail2ban installed
- [✓] Regular backups configured
- [✓] SSL/TLS certificates installed
- [✓] Strong database passwords
- [✓] Environment variables secured
- [✓] Non-root user for application
- [✓] Rate limiting configured in Nginx
- [✓] Security headers enabled
- [✓] Regular system updates

---

## Next Steps

1. **Test thoroughly** - Make test calls, upload documents, etc.
2. **Set up monitoring** - Configure uptime monitoring (UptimeRobot, etc.)
3. **Configure backups** - Ensure database backups are working
4. **Performance tuning** - Adjust based on actual usage
5. **Scale as needed** - Upgrade server or add more instances

---

**Deployment Date**: June 13, 2026  
**Version**: CYRUS AI v3.0.0  
**Server**: Hetzner Cloud CPX31
