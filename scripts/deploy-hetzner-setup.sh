#!/bin/bash
# CYRUS AI - Automated Hetzner Deployment Script
# This script automates the initial server setup on Hetzner VPS

set -e

echo "========================================"
echo "CYRUS AI - Hetzner Deployment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (first-time setup)"
   echo "Usage: sudo ./scripts/deploy-hetzner-setup.sh"
   exit 1
fi

echo "This script will:"
echo "  1. Update system packages"
echo "  2. Create a non-root user (cyrus)"
echo "  3. Install Docker and Docker Compose"
echo "  4. Install Node.js 22"
echo "  5. Configure firewall (UFW)"
echo "  6. Install fail2ban"
echo "  7. Set up the deployment directory"
echo ""

read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Step 1: Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Step 2: Install essential packages
print_info "Installing essential packages..."
apt install -y curl wget git vim ufw fail2ban htop iotop net-tools
print_success "Essential packages installed"

# Step 3: Create non-root user
print_info "Creating user 'cyrus'..."
if id "cyrus" &>/dev/null; then
    print_info "User 'cyrus' already exists"
else
    adduser --gecos "" --disabled-password cyrus
    echo "cyrus:$(openssl rand -base64 16)" | chpasswd
    usermod -aG sudo cyrus
    
    # Copy SSH keys
    if [ -d /root/.ssh ]; then
        mkdir -p /home/cyrus/.ssh
        cp /root/.ssh/authorized_keys /home/cyrus/.ssh/ 2>/dev/null || true
        chown -R cyrus:cyrus /home/cyrus/.ssh
        chmod 700 /home/cyrus/.ssh
        chmod 600 /home/cyrus/.ssh/authorized_keys 2>/dev/null || true
    fi
    
    print_success "User 'cyrus' created"
fi

# Step 4: Configure firewall
print_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 10000:20000/udp comment 'WebRTC'
ufw --force enable
print_success "Firewall configured"

# Step 5: Install Docker
print_info "Installing Docker..."
if command -v docker &> /dev/null; then
    print_info "Docker already installed"
else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker cyrus
    print_success "Docker installed"
fi

# Step 6: Install Docker Compose
print_info "Installing Docker Compose..."
apt install -y docker-compose-plugin
print_success "Docker Compose installed"

# Step 7: Install Node.js 22
print_info "Installing Node.js 22..."
if command -v node &> /dev/null && [[ $(node -v) == v22.* ]]; then
    print_info "Node.js 22 already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    print_success "Node.js 22 installed"
fi

# Step 8: Configure fail2ban
print_info "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF
systemctl enable fail2ban
systemctl restart fail2ban
print_success "fail2ban configured"

# Step 9: Create deployment directory
print_info "Creating deployment directory..."
mkdir -p /home/cyrus/cyrus-ai
chown -R cyrus:cyrus /home/cyrus/cyrus-ai
print_success "Deployment directory created"

# Step 10: Harden SSH
print_info "Hardening SSH configuration..."
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
print_success "SSH hardened (root login disabled, password auth disabled)"

# Step 11: Set up automatic security updates
print_info "Configuring automatic security updates..."
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
print_success "Automatic security updates enabled"

# Step 12: Create helpful aliases
print_info "Creating helpful aliases for cyrus user..."
cat >> /home/cyrus/.bashrc <<'EOF'

# CYRUS AI Aliases
alias cyrus-logs='cd ~/cyrus-ai && docker compose logs -f'
alias cyrus-status='cd ~/cyrus-ai && docker compose ps'
alias cyrus-restart='cd ~/cyrus-ai && docker compose restart'
alias cyrus-update='cd ~/cyrus-ai && git pull && docker compose up -d --build'
alias cyrus-backup='~/backup-db.sh'
EOF
chown cyrus:cyrus /home/cyrus/.bashrc
print_success "Aliases created"

# Step 13: Display versions
echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
print_success "System Information:"
echo "  - Docker: $(docker --version)"
echo "  - Docker Compose: $(docker compose version)"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo ""

print_info "Next Steps:"
echo ""
echo "1. Log in as cyrus user:"
echo "   ssh cyrus@$(hostname -I | awk '{print $1}')"
echo ""
echo "2. Clone your repository:"
echo "   cd ~/cyrus-ai"
echo "   git clone <your-repo-url> ."
echo ""
echo "3. Run the application setup script:"
echo "   ./scripts/deploy-hetzner-app.sh"
echo ""
echo "4. Configure your domain DNS to point to this server:"
echo "   A Record: @ -> $(curl -s ifconfig.me)"
echo ""
echo "========================================"
echo ""

print_info "Server IP: $(curl -s ifconfig.me)"
print_info "Login: ssh cyrus@$(curl -s ifconfig.me)"
echo ""

print_success "Setup complete! Please log in as 'cyrus' user for application deployment."
