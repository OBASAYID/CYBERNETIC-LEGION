#!/bin/bash

# CYRUS AI System - GitHub Repository Check
# Verify if the repository exists before pushing

echo "🔍 Checking GitHub Repository Status"
echo "===================================="
echo ""

REPO_URL="https://github.com/cybercrypton/cyrus-ai-system"

echo "Checking repository: $REPO_URL"
echo ""

# Check if repository exists (basic HTTP check)
if curl -s --head "$REPO_URL" | head -n 1 | grep -q "HTTP/2 200"; then
    echo "✅ Repository exists on GitHub!"
    echo ""
    echo "🚀 Ready to push code. Run:"
    echo "git push -u origin main"
    echo ""
    echo "Then deploy to Railway.app"
else
    echo "❌ Repository does NOT exist on GitHub"
    echo ""
    echo "📋 Please create the repository first:"
    echo "1. Go to: https://github.com/new"
    echo "2. Name: cyrus-ai-system"
    echo "3. Make it PUBLIC"
    echo "4. Don't add README/gitignore/license"
    echo "5. Click 'Create repository'"
    echo ""
    echo "Then run this script again to verify."
fi