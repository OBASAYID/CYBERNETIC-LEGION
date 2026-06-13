# CYRUS AI - Hetzner Quick Start

Fast track guide to deploy CYRUS AI on Hetzner in under 30 minutes.

## Prerequisites

✅ Hetzner Cloud account  
✅ Domain name (pointed to server IP)  
✅ SSH key pair  
✅ Terminal access

---

## Step 1: Create Hetzner Server (5 minutes)

1. **Go to** [Hetzner Cloud Console](https://console.hetzner.cloud/)

2. **Create Project**: `cyrus-ai-production`

3. **Add Server**:
   - **Location**: Nuremberg (DE) or Falkenstein (DE)
   - **Image**: Ubuntu 22.04 LTS
   - **Type**: **CPX31** (4 vCPU, 8GB RAM) - €11.90/month
   - **SSH Key**: Add your public key
   - **Backups**: ✅ Enable
   - **Name**: `cyrus-ai-prod-01`

4. **Click "Create & Buy Now"**

5. **Note the IP address**: `xxx.xxx.xxx.xxx`

---

## Step 2: Point Domain to Server (5 minutes)

Go to your domain registrar (Namecheap, Cloudflare, etc.) and add:

```dns
Type  Name  Value
A     @     xxx.xxx.xxx.xxx  (your server IP)
A     www   xxx.xxx.xxx.xxx  (your server IP)
```

Wait 5-10 minutes for DNS propagation.

---

## Step 3: Initial Server Setup (10 minutes)

### Connect to Server

```bash
ssh root@xxx.xxx.xxx.xxx
```

### Upload Repository

From your local machine:

```bash
# Zip the repository
cd /Users/cronet/Downloads/cyrus-part2-assets-fullzip
tar -czf cyrus-ai.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .

# Upload to server
scp cyrus-ai.tar.gz root@xxx.xxx.xxx.xxx:/tmp/

# Or clone from GitHub
# ssh root@xxx.xxx.xxx.xxx
# git clone https://github.com/OBASAYID/CYBERNETIC-LEGION.git /root/cyrus-ai
```

### Run Setup Script

On the server (as root):

```bash
# Extract archive
cd /root
tar -xzf /tmp/cyrus-ai.tar.gz -C cyrus-ai

# Or if cloned from GitHub
# cd /root/cyrus-ai

# Run initial setup
cd cyrus-ai
chmod +x scripts/deploy-hetzner-setup.sh
./scripts/deploy-hetzner-setup.sh
```

This script will:
- ✅ Update system packages
- ✅ Create `cyrus` user
- ✅ Install Docker & Docker Compose
- ✅ Install Node.js 22
- ✅ Configure firewall
- ✅ Harden SSH
- ✅ Install fail2ban

**Duration**: ~5 minutes

---

## Step 4: Deploy Application (10 minutes)

### Switch to cyrus User

```bash
# Log out and log back in as cyrus
exit
ssh cyrus@xxx.xxx.xxx.xxx
```

### Copy Application Files

```bash
# If you uploaded as root, copy to cyrus home
sudo cp -r /root/cyrus-ai/* ~/cyrus-ai/
sudo chown -R cyrus:cyrus ~/cyrus-ai

# Enter directory
cd ~/cyrus-ai
```

### Run Application Deployment

```bash
./scripts/deploy-hetzner-app.sh
```

You'll be prompted for:
- **Domain**: `your-domain.com`
- **Email**: `your@email.com`
- **Generate passwords?**: `y` (recommended)

The script will:
- ✅ Create environment configuration
- ✅ Set up Docker Compose
- ✅ Create Dockerfile & Nginx config
- ✅ Obtain SSL certificate
- ✅ Build and start all services
- ✅ Configure automated backups

**Duration**: ~5 minutes

---

## Step 5: Verify Deployment (2 minutes)

### Check Services

```bash
docker compose ps
```

All services should show "Up" status.

### Test Application

```bash
# Local health check
curl http://localhost:3020/api/health

# Public access
curl https://your-domain.com/api/health
```

### View Logs

```bash
docker compose logs -f app
```

Press `Ctrl+C` to stop viewing logs.

### Access in Browser

Open: **https://your-domain.com**

---

## Quick Commands Reference

```bash
# View all services status
cyrus-status
# or: docker compose ps

# View logs
cyrus-logs
# or: docker compose logs -f

# Restart application
cyrus-restart
# or: docker compose restart

# Update application
cyrus-update
# or: git pull && docker compose up -d --build

# Backup database
cyrus-backup
# or: ~/backup-db.sh

# Stop all services
docker compose down

# Start all services
docker compose up -d
```

---

## Post-Deployment Configuration

### 1. Configure Azure Services (Optional)

Edit `~/cyrus-ai/.env`:

```bash
nano ~/cyrus-ai/.env
```

Add your Azure credentials:

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Azure Document Intelligence
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your-key
```

Restart after changes:

```bash
docker compose restart app
```

### 2. Set Up TURN Server (Required for Production Calls)

See: `HETZNER_DEPLOYMENT_GUIDE.md` → WebRTC/TURN Setup

**Quick Option**: Use a managed TURN service like Metered.ca or Twilio.

Add to `.env`:

```env
TURN_URLS=turn:global.turn.twilio.com:3478?transport=udp
TURN_USERNAME=your-username
TURN_PASSWORD=your-password
```

### 3. Configure Monitoring

Install Netdata (optional):

```bash
bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait
```

Access at: `http://your-server-ip:19999`

---

## Troubleshooting

### Application Not Starting

```bash
# Check logs
docker compose logs app

# Check all services
docker compose ps

# Restart
docker compose restart
```

### SSL Certificate Issues

```bash
# Retry certificate
docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email your@email.com \
    --agree-tos \
    -d your-domain.com \
    -d www.your-domain.com

# Restart nginx
docker compose restart nginx
```

### Database Connection Issues

```bash
# Check database
docker compose exec postgres psql -U cyrus cyrus_ai

# Check logs
docker compose logs postgres
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Check logs size
du -sh ~/cyrus-ai/logs/*
```

---

## Scaling & Optimization

### Upgrade Server

1. Go to Hetzner Console
2. Click "Resize"
3. Select larger plan (e.g., CPX41: 8 vCPU, 16GB RAM)
4. Server will reboot automatically

### Add More Storage

1. Create Volume in Hetzner Console
2. Attach to server
3. Mount volume
4. Update docker-compose.yml volumes

---

## Backup & Recovery

### Manual Backup

```bash
cyrus-backup
```

Backups stored in: `~/backups/`

### Automated Backups

Already configured! Runs daily at 2 AM.

### Restore from Backup

```bash
# List backups
ls -lh ~/backups/

# Restore
gunzip < ~/backups/cyrus_db_YYYYMMDD_HHMMSS.sql.gz | \
    docker compose exec -T postgres psql -U cyrus cyrus_ai
```

---

## Maintenance

### Update Application

```bash
cd ~/cyrus-ai
git pull
docker compose up -d --build
```

### Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### View Resource Usage

```bash
# Memory
free -h

# Disk
df -h

# CPU
htop

# Docker stats
docker stats
```

---

## Cost Breakdown

**Monthly Costs**:
- CPX31 Server: €11.90
- Backups (20%): €2.38
- **Total**: **€14.28/month (~$15.50/month)**

**Optional Add-ons**:
- TURN Server (Metered.ca): $5-10/month
- Domain: ~$12/year
- Additional storage: ~€4/month per 10GB

---

## Security Checklist

- [✓] SSH key authentication only
- [✓] Firewall enabled (UFW)
- [✓] Fail2ban active
- [✓] SSL/TLS certificate
- [✓] Strong passwords generated
- [✓] Regular automated backups
- [✓] Security headers in Nginx
- [✓] Rate limiting enabled
- [✓] Non-root user for app

---

## Support

**Full Documentation**: `HETZNER_DEPLOYMENT_GUIDE.md`

**Common Issues**: See Troubleshooting section above

**Hetzner Support**: https://console.hetzner.cloud/support

---

## Summary

✅ **Total Time**: ~30 minutes  
✅ **Cost**: ~$15/month  
✅ **Performance**: Excellent (4 vCPU, 8GB RAM)  
✅ **Scalability**: Easy to upgrade  
✅ **Location**: Germany (EU) - Great for European users  

Your CYRUS AI application is now live and production-ready! 🚀

---

*Last Updated: June 13, 2026*  
*CYRUS AI v3.0.0*
