#!/bin/bash
# CYRUS AI Mobile Setup Script
# This script sets up the mobile app configuration

set -e

echo "======================================"
echo "  CYRUS AI Mobile App Setup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "${YELLOW}Node.js is not installed. Please install Node.js v22+ first.${NC}"
    exit 1
fi

echo "${GREEN}✓${NC} Node.js version: $(node --version)"
echo ""

# Install Capacitor dependencies
echo "${BLUE}Installing Capacitor dependencies...${NC}"
npm install --save \
    @capacitor/core \
    @capacitor/camera \
    @capacitor/geolocation \
    @capacitor/status-bar \
    @capacitor/keyboard \
    @capacitor/app \
    @capacitor/network \
    @capacitor/device \
    @capacitor/splash-screen \
    @capacitor/local-notifications \
    @capacitor/push-notifications \
    @capacitor/share \
    @capacitor/filesystem \
    @capacitor/haptics \
    @capacitor/ios \
    @capacitor/android

echo "${GREEN}✓${NC} Capacitor dependencies installed"
echo ""

# Build the web app
echo "${BLUE}Building web app...${NC}"
npm run build
echo "${GREEN}✓${NC} Web app built"
echo ""

# Initialize Capacitor if not already done
if [ ! -f "capacitor.config.ts" ] && [ ! -f "capacitor.config.json" ]; then
    echo "${BLUE}Initializing Capacitor...${NC}"
    npx cap init "CYRUS AI" "com.cyrus.ai.mobile" --web-dir="dist/public"
    echo "${GREEN}✓${NC} Capacitor initialized"
else
    echo "${GREEN}✓${NC} Capacitor already initialized"
fi
echo ""

# Ask user which platforms to add
read -p "Add iOS platform? (y/n): " add_ios
if [[ $add_ios == "y" || $add_ios == "Y" ]]; then
    if [ ! -d "ios" ]; then
        echo "${BLUE}Adding iOS platform...${NC}"
        npx cap add ios
        echo "${GREEN}✓${NC} iOS platform added"
    else
        echo "${GREEN}✓${NC} iOS platform already exists"
    fi
fi
echo ""

read -p "Add Android platform? (y/n): " add_android
if [[ $add_android == "y" || $add_android == "Y" ]]; then
    if [ ! -d "android" ]; then
        echo "${BLUE}Adding Android platform...${NC}"
        npx cap add android
        echo "${GREEN}✓${NC} Android platform added"
    else
        echo "${GREEN}✓${NC} Android platform already exists"
    fi
fi
echo ""

# Sync platforms
echo "${BLUE}Syncing platforms...${NC}"
npx cap sync
echo "${GREEN}✓${NC} Platforms synced"
echo ""

# Run doctor to check setup
echo "${BLUE}Running Capacitor doctor...${NC}"
npx cap doctor
echo ""

echo "======================================"
echo "${GREEN}  Mobile Setup Complete! ✓${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
if [[ $add_ios == "y" || $add_ios == "Y" ]] && [ -d "ios" ]; then
    echo "  iOS:"
    echo "    1. Open Xcode: ${BLUE}npm run mobile:open:ios${NC}"
    echo "    2. Select your development team"
    echo "    3. Choose target device and run"
    echo ""
fi
if [[ $add_android == "y" || $add_android == "Y" ]] && [ -d "android" ]; then
    echo "  Android:"
    echo "    1. Open Android Studio: ${BLUE}npm run mobile:open:android${NC}"
    echo "    2. Wait for Gradle sync"
    echo "    3. Choose target device and run"
    echo ""
fi
echo "  For more information, see: ${BLUE}MOBILE_APP_GUIDE.md${NC}"
echo ""
