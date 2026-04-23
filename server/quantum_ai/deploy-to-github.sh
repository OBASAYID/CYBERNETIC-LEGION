#!/bin/bash

# CYRUS AI System - Quick GitHub Deployment Helper
# This script helps push your code to GitHub for public deployment

echo "🚀 CYRUS AI System - GitHub Deployment Helper"
echo "=============================================="
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

# Check if GitHub remote already exists
if git remote get-url origin &>/dev/null; then
    print_warning "GitHub remote 'origin' already exists!"
    echo "Current remote: $(git remote get-url origin)"
    echo ""
    echo "If you want to change it, please provide your GitHub repository URL:"
    read -p "GitHub Repository URL: " repo_url
    if [ ! -z "$repo_url" ]; then
        git remote set-url origin "$repo_url"
        print_success "Updated GitHub remote to: $repo_url"
    fi
else
    echo "Please provide your GitHub repository information:"
    echo ""
    read -p "Your GitHub Username: " github_username
    read -p "Repository Name (default: cyrus-ai-system): " repo_name

    if [ -z "$repo_name" ]; then
        repo_name="cyrus-ai-system"
    fi

    repo_url="https://github.com/$github_username/$repo_name.git"

    echo ""
    echo "Repository URL: $repo_url"
    read -p "Is this correct? (y/n): " confirm

    if [[ $confirm =~ ^[Yy][Ee]?[Ss]?$ ]]; then
        git remote add origin "$repo_url"
        print_success "Added GitHub remote: $repo_url"
    else
        print_error "Please run this script again with correct information."
        exit 1
    fi
fi

echo ""
echo "Pushing code to GitHub..."
echo ""

# Push to GitHub
if git push -u origin main; then
    print_success "Code successfully pushed to GitHub!"
    echo ""
    echo "🌐 Your repository: $(git remote get-url origin)"
    echo ""
    echo "Next steps:"
    echo "1. Go to Railway.app and deploy from this repository"
    echo "2. Or deploy to Vercel, Heroku, or another platform"
    echo "3. Your CYRUS AI System will be publicly accessible!"
    echo ""
    print_success "🎉 Ready for worldwide deployment!"
else
    print_error "Failed to push to GitHub. Please check:"
    echo "  - Repository exists on GitHub"
    echo "  - You have push permissions"
    echo "  - Repository URL is correct"
    echo "  - Try: git push -u origin main --force"
fi