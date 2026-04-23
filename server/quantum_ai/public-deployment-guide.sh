#!/bin/bash

# CYRUS AI System - Public Deployment Guide
# This script provides a secure, comprehensive guide for deploying CYRUS to make it accessible from any network

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

# CYRUS AI System - Public Deployment Guide
# This script helps deploy CYRUS to make it accessible from any network

echo "🚀 CYRUS AI System - Public Deployment Guide"
echo "=============================================="
echo ""

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration variables
SCRIPT_VERSION="1.0.0"
REQUIRED_TOOLS=("git" "npm" "node")
RECOMMENDED_NODE_VERSION="18"
MINIMUM_NODE_VERSION="16"

# Utility functions
print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}$(printf '%.0s=' {1..${#1}})${NC}"
}

# Pre-flight checks
check_requirements() {
    print_header "Pre-Flight Checks"

    # Check for required tools
    for tool in "${REQUIRED_TOOLS[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            print_error "Required tool '$tool' is not installed."
            echo "Please install $tool and try again."
            exit 1
        else
            print_success "$tool is available"
        fi
    done

    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_VERSION" -lt "$MINIMUM_NODE_VERSION" ]; then
            print_error "Node.js version $NODE_VERSION is too old. Minimum required: $MINIMUM_NODE_VERSION"
            exit 1
        elif [ "$NODE_VERSION" -lt "$RECOMMENDED_NODE_VERSION" ]; then
            print_warning "Node.js version $NODE_VERSION detected. Recommended: $RECOMMENDED_NODE_VERSION+"
        else
            print_success "Node.js version $NODE_VERSION is compatible"
        fi
    fi

    # Check if we're in a git repository
    if ! git rev-parse --git-dir &> /dev/null; then
        print_warning "Not in a git repository. Some deployment steps may not work."
    else
        print_success "Git repository detected"
    fi

    echo ""
}

# Generate secure random secrets
generate_secrets() {
    print_info "Generating secure session secret..."
    if command -v openssl &> /dev/null; then
        SESSION_SECRET=$(openssl rand -hex 32)
    elif command -v python3 &> /dev/null; then
        SESSION_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    else
        SESSION_SECRET="CHANGE_THIS_IN_PRODUCTION_$(date +%s)_$(openssl rand -hex 16 2>/dev/null || echo 'fallback_secret')"
        print_warning "Using fallback secret generation. Please change SESSION_SECRET in production!"
    fi
}

# Validate GitHub username format
validate_github_username() {
    local username="$1"
    if [[ ! "$username" =~ ^[a-zA-Z0-9]([a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$ ]]; then
        print_error "Invalid GitHub username format: $username"
        echo "GitHub usernames must be 1-39 characters, containing only alphanumeric characters and hyphens."
        echo "They cannot start or end with a hyphen, and cannot have consecutive hyphens."
        return 1
    fi
    return 0
}

# Main deployment guide
main() {
    check_requirements

    echo "This guide will help you deploy CYRUS AI System to make it accessible from any network."
    echo ""

    print_step "1" "GitHub Repository Setup"
    echo "Create a new repository on GitHub:"
    echo "  1. Go to https://github.com/new"
    echo "  2. Repository name: cyrus-ai-system"
    echo "  3. Make it public or private (your choice)"
    echo "  4. Don't initialize with README (we already have one)"
    echo "  5. Click 'Create repository'"
    echo ""

    # Interactive GitHub setup
    read -p "Enter your GitHub username: " GITHUB_USERNAME
    if [ -n "$GITHUB_USERNAME" ]; then
        if validate_github_username "$GITHUB_USERNAME"; then
            print_step "2" "Push Code to GitHub"
            echo "After creating the repository, run these commands:"
            echo ""
            echo "  # Add GitHub remote (replace YOUR_USERNAME with your GitHub username)"
            echo "  git remote add origin https://github.com/${GITHUB_USERNAME}/cyrus-ai-system.git"
            echo ""
            echo "  # Push the code"
            echo "  git push -u origin main"
            echo ""
        fi
    else
        print_warning "Skipping GitHub setup. You can set it up manually later."
    fi

    print_step "3" "Railway Deployment (Recommended)"
    echo "Railway provides free hosting with automatic deployments:"
    echo ""
    echo "  1. Go to https://railway.app"
    echo "  2. Sign up/Login with GitHub"
    echo "  3. Click 'New Project'"
    echo "  4. Choose 'Deploy from GitHub repo'"
    echo "  5. Search for 'cyrus-ai-system' and select it"
    echo "  6. Click 'Deploy'"
    echo ""
    echo "Railway will automatically:"
    echo "  - Build your application using the railway.toml config"
    echo "  - Set up a PostgreSQL database"
    echo "  - Provide a public URL (e.g., https://cyrus-ai-system.up.railway.app)"
    echo ""

    print_step "4" "Environment Variables Setup"
    generate_secrets
    echo "In Railway dashboard, add these environment variables:"
    echo ""
    echo "  DATABASE_URL=postgresql://... (auto-provided by Railway)"
    echo "  SESSION_SECRET=${SESSION_SECRET}"
    echo "  USE_LOCAL_LLM=true"
    echo "  USE_LOCAL_VISION=true"
    echo "  USE_LOCAL_IMAGE_GEN=true"
    echo "  NODE_ENV=production"
    echo ""

    print_step "5" "Alternative Deployment Options"
    echo ""

    echo "Option A: Vercel (Frontend + API)"
    echo "  1. Go to https://vercel.com"
    echo "  2. Import your GitHub repository"
    echo "  3. Configure build settings:"
    echo "     - Build Command: npm run build"
    echo "     - Output Directory: dist/public"
    echo "     - Install Command: npm install"
    echo ""

    echo "Option B: Heroku"
    echo "  1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli"
    echo "  2. Run: heroku create cyrus-ai-system"
    echo "  3. Run: git push heroku main"
    echo "  4. Add PostgreSQL add-on: heroku addons:create heroku-postgresql"
    echo "  5. Set environment variables: heroku config:set SESSION_SECRET=${SESSION_SECRET}"
    echo ""

    echo "Option C: DigitalOcean App Platform"
    echo "  1. Go to https://cloud.digitalocean.com/apps"
    echo "  2. Create new app from GitHub repository"
    echo "  3. Configure environment variables (same as Railway)"
    echo "  4. Set up domain and SSL certificates"
    echo ""

    print_step "6" "Post-Deployment Configuration"
    echo "After deployment:"
    echo ""
    echo "  1. Visit your public URL"
    echo "  2. Test the health endpoint: YOUR_URL/health/live"
    echo "  3. Configure any additional API keys if needed"
    echo "  4. Set up custom domain (optional)"
    echo "  5. Enable monitoring and logging"
    echo ""

    print_step "7" "Security Checklist"
    echo "Before going live, ensure:"
    echo ""
    echo "  ✅ SESSION_SECRET is changed from default"
    echo "  ✅ NODE_ENV is set to 'production'"
    echo "  ✅ Database credentials are secure"
    echo "  ✅ API keys are properly configured"
    echo "  ✅ HTTPS is enabled"
    echo "  ✅ Rate limiting is configured"
    echo ""

    print_step "8" "QR Code Generation"
    echo "Once deployed, you can generate a QR code for easy sharing:"
    echo ""
    echo "  npm install -g qrcode-terminal"
    echo "  qrcode-terminal YOUR_PUBLIC_URL"
    echo ""

    print_success "Deployment Benefits:"
    echo "  ✅ Accessible from any network worldwide"
    echo "  ✅ Automatic HTTPS certificates"
    echo "  ✅ Scalable infrastructure"
    echo "  ✅ Professional public URL"
    echo "  ✅ 99.9% uptime guarantees"
    echo "  ✅ Automatic deployments from Git"
    echo ""

    print_warning "Important Security Notes:"
    echo "  - Never commit secrets to version control"
    echo "  - Keep SESSION_SECRET secure and random (length: 64+ characters)"
    echo "  - Monitor your usage for free tier limits"
    echo "  - Back up your database regularly"
    echo "  - Consider setting up monitoring/alerts"
    echo "  - Use HTTPS in production (automatically enabled)"
    echo ""

    print_info "Monitoring & Maintenance:"
    echo "  - Set up uptime monitoring (e.g., UptimeRobot, Pingdom)"
    echo "  - Configure error tracking (e.g., Sentry)"
    echo "  - Set up log aggregation (e.g., Papertrail, LogDNA)"
    echo "  - Monitor performance metrics"
    echo "  - Regular security updates"
    echo ""

    echo -e "${GREEN}Ready to deploy CYRUS AI System publicly! 🚀${NC}"
    echo ""
    echo "Need help with any step? Check the documentation or create an issue on GitHub."
    echo "Your CYRUS system will be accessible worldwide once deployed."
    echo ""
    echo "Generated session secret: ${SESSION_SECRET}"
    echo "Keep this secret secure and use it in your environment variables."
}

# Error handling
trap 'print_error "Script interrupted by user"' INT TERM

# Run main function
main "$@"