#!/bin/bash
# CYRUS AI - Application Deployment Script
# Run this as the 'cyrus' user after initial server setup

set -e

echo "========================================"
echo "CYRUS AI - Application Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_prompt() {
    echo -e "${BLUE}? $1${NC}"
}

# Check if running as cyrus user
if [[ $(whoami) != "cyrus" ]]; then
   print_error "This script must be run as 'cyrus' user"
   echo "Usage: ./scripts/deploy-hetzner-app.sh"
   exit 1
fi

# Check if in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Are you in the cyrus-ai directory?"
    echo "cd ~/cyrus-ai && ./scripts/deploy-hetzner-app.sh"
    exit 1
fi

# Get configuration from user
echo "Let's configure your deployment!"
echo ""

print_prompt "Enter your domain name (e.g., cyrus.example.com):"
read -r DOMAIN

print_prompt "Enter your email for SSL certificate:"
read -r EMAIL

print_prompt "Generate secure passwords? (y/n):"
read -r -n 1 GEN_PASS
echo ""

if [[ $GEN_PASS =~ ^[Yy]$ ]]; then
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    REDIS_PASSWORD=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 64)
    print_success "Secure passwords generated"
else
    print_prompt "Enter PostgreSQL password:"
    read -r -s POSTGRES_PASSWORD
    echo ""
    print_prompt "Enter Redis password:"
    read -r -s REDIS_PASSWORD
    echo ""
    print_prompt "Enter session secret:"
    read -r -s SESSION_SECRET
    echo ""
fi

echo ""
print_info "Configuration Summary:"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo "  PostgreSQL Password: [SET]"
echo "  Redis Password: [SET]"
echo "  Session Secret: [SET]"
echo ""

print_prompt "Proceed with deployment? (y/n):"
read -r -n 1 PROCEED
echo ""

if [[ ! $PROCEED =~ ^[Yy]$ ]]; then
    print_error "Deployment cancelled"
    exit 1
fi

# Step 1: Create .env file
print_info "Creating environment configuration..."
cat > .env <<EOF
# Server Configuration
NODE_ENV=production
PORT=3020
CYRUS_LIVE_PORT=3020

# Domain
DOMAIN=$DOMAIN

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://cyrus:$POSTGRES_PASSWORD@postgres:5432/cyrus_ai

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# Session Store
CYRUS_SESSION_STORE=postgresql
SESSION_SECRET=$SESSION_SECRET

# Public URLs
PUBLIC_BASE_URL=https://$DOMAIN
BASE_URL=https://$DOMAIN

# Security
CYRUS_COMM_WS_TOKEN=$(openssl rand -base64 32)

# Logging
LOG_LEVEL=info

# Feature Flags
CYRUS_SINGLE_ORIGIN=1
CYRUS_UI_ROOT=cyrus-ui

# Azure OpenAI (Configure these if using Azure services)
# AZURE_OPENAI_ENDPOINT=
# AZURE_OPENAI_API_KEY=
# AZURE_OPENAI_DEPLOYMENT_NAME=

# Azure Document Intelligence
# AZURE_FORM_RECOGNIZER_ENDPOINT=
# AZURE_FORM_RECOGNIZER_KEY=

# TURN Server (Configure for production WebRTC)
# TURN_URLS=
# TURN_USERNAME=
# TURN_PASSWORD=
EOF

chmod 600 .env
print_success "Environment configuration created"

# Step 2: Create Docker Compose file
print_info "Creating Docker Compose configuration..."
cat > docker-compose.yml <<'EOFCOMPOSE'
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
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
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
    env_file:
      - .env
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
EOFCOMPOSE

print_success "Docker Compose configuration created"

# Step 3: Create Dockerfile
print_info "Creating Dockerfile..."
cat > Dockerfile <<'EOFDOCKER'
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci --omit=dev

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl tini

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

RUN mkdir -p /app/uploads /app/logs && \
    chown -R node:node /app

USER node

EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3020/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/server/index.js"]
EOFDOCKER

print_success "Dockerfile created"

# Step 4: Create Nginx configuration
print_info "Creating Nginx configuration..."
cat > nginx.conf <<EOFNGINX
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

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;

    limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=general_limit:10m rate=100r/s;

    upstream cyrus_app {
        server app:3020;
        keepalive 32;
    }

    map \$http_upgrade \$connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        listen [::]:80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name $DOMAIN www.$DOMAIN;

        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
        ssl_prefer_server_ciphers off;

        add_header Strict-Transport-Security "max-age=63072000" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        location / {
            limit_req zone=general_limit burst=50 nodelay;
            
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection \$connection_upgrade;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        location /socket.io/ {
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }

        location /ws {
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }

        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://cyrus_app;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /api/health {
            proxy_pass http://cyrus_app;
            access_log off;
        }
    }
}
EOFNGINX

print_success "Nginx configuration created"

# Step 5: Start Nginx for certificate
print_info "Starting Nginx for SSL certificate..."
docker compose up -d nginx
sleep 5
print_success "Nginx started"

# Step 6: Get SSL certificate
print_info "Obtaining SSL certificate from Let's Encrypt..."
docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" || {
        print_error "Failed to obtain SSL certificate"
        print_info "Make sure your domain DNS is pointed to this server"
        print_info "You can retry later with: docker compose run --rm certbot certonly ..."
        print_info "Continuing without SSL for now..."
    }

# Step 7: Build and start all services
print_info "Building and starting all services..."
docker compose up -d --build
print_success "All services started"

# Step 8: Wait for app to be ready
print_info "Waiting for application to be ready..."
RETRIES=30
while [ $RETRIES -gt 0 ]; do
    if curl -f http://localhost:3020/api/health > /dev/null 2>&1; then
        print_success "Application is ready!"
        break
    fi
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    print_error "Application failed to start properly"
    print_info "Check logs with: docker compose logs -f app"
    exit 1
fi

# Step 9: Create backup script
print_info "Creating backup script..."
cat > ~/backup-db.sh <<'EOFBACKUP'
#!/bin/bash
BACKUP_DIR="/home/cyrus/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cyrus_db_$DATE.sql"

mkdir -p $BACKUP_DIR

cd /home/cyrus/cyrus-ai
docker compose exec -T postgres pg_dump -U cyrus cyrus_ai > $BACKUP_FILE

gzip $BACKUP_FILE

find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOFBACKUP

chmod +x ~/backup-db.sh
print_success "Backup script created"

# Step 10: Add cron job for backups
print_info "Setting up automated backups..."
(crontab -l 2>/dev/null | grep -v backup-db.sh; echo "0 2 * * * /home/cyrus/backup-db.sh") | crontab -
print_success "Automated backups configured (daily at 2 AM)"

# Step 11: Display deployment info
echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
print_success "Your CYRUS AI application is now running!"
echo ""
echo "Access your application at:"
echo "  https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  cyrus-logs      - View application logs"
echo "  cyrus-status    - Check service status"
echo "  cyrus-restart   - Restart services"
echo "  cyrus-update    - Update and rebuild"
echo "  cyrus-backup    - Manual database backup"
echo ""
echo "Or use docker compose directly:"
echo "  cd ~/cyrus-ai"
echo "  docker compose logs -f     - View logs"
echo "  docker compose ps          - Check status"
echo "  docker compose restart     - Restart services"
echo ""
print_info "Next Steps:"
echo "1. Test your application at https://$DOMAIN"
echo "2. Configure Azure OpenAI/Document Intelligence keys in .env if needed"
echo "3. Set up TURN server for production WebRTC (see HETZNER_DEPLOYMENT_GUIDE.md)"
echo "4. Monitor logs: docker compose logs -f"
echo ""
echo "========================================"
