#!/bin/bash

# CYRUS AI System - Manual GitHub Setup
# Alternative approach if the automated script has issues

echo "🔧 CYRUS AI System - Manual GitHub Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "Manual setup for GitHub repository: crypton980/cyrus-cybernetic"
echo ""

# Check current git status
echo "Checking git status..."
if git status --porcelain | grep -q .; then
    print_warning "You have uncommitted changes. Committing them first..."
    git add .
    git commit -m "🚀 Deploy CYRUS AI System v3.0 - Public Release

- ✅ Enhanced Communication System with AI intelligence
- 📞 International calling & messaging with AES-256 encryption
- 🧠 Local AI models (OpenAI independent)
- 🎯 Robotics integration & control
- 🌐 Production-ready for worldwide deployment
- 📱 QR code generation for easy access"
    print_success "Changes committed"
else
    print_success "Repository is clean"
fi

echo ""
echo "Now run these commands manually:"
echo ""

echo "1. Add GitHub remote:"
echo -e "${BLUE}git remote add origin https://github.com/crypton980/cyrus-cybernetic.git${NC}"
echo ""

echo "2. Push to GitHub:"
echo -e "${BLUE}git push -u origin main${NC}"
echo ""

echo "3. If you get authentication errors, you may need to:"
echo -e "${YELLOW}git config --global credential.helper store${NC}"
echo "Then try the push command again and enter your GitHub credentials."
echo ""

print_success "After pushing, go to Railway.app to deploy!"
echo ""
echo "Railway will give you a public URL like:"
echo "https://cyrus-cybernetic.up.railway.app"
echo ""
echo "Then generate QR codes with:"
echo -e "${BLUE}npm install -g qrcode-terminal${NC}"
echo -e "${BLUE}qrcode-terminal YOUR_RAILWAY_URL${NC}"