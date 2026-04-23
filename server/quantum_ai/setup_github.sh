#!/bin/bash

# CYRUS AI System - GitHub Repository Setup
echo "🚀 Setting up CYRUS AI on GitHub"
echo "================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: CYRUS AI System v3.0"
fi

# Set up GitHub remote
echo "🔗 Setting up GitHub remote..."
git remote add origin https://github.com/crypton980/cyrus-cybernetic.git 2>/dev/null || git remote set-url origin https://github.com/crypton980/cyrus-cybernetic.git

# Create main branch if needed
git branch -M main

echo "📤 Ready to push to GitHub!"
echo ""
echo "To push your code to GitHub, run:"
echo "  git push -u origin main"
echo ""
echo "After pushing, GitHub Pages will be available at:"
echo "  https://crypton980.github.io/cyrus-cybernetic"
echo ""
echo "For full AI functionality, deploy to:"
echo "  - Railway: https://railway.app"
echo "  - Vercel: https://vercel.com"
echo "  - Replit: https://replit.com"
