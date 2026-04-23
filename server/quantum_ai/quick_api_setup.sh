#!/bin/bash
# Quick API Key Setup for CYRUS Super-Intelligence

echo "🔑 CYRUS Super-Intelligence API Key Setup"
echo "=========================================="

# Check if API key is already set
if [ -n "$OPENAI_API_KEY" ]; then
    echo "✅ OpenAI API key is already set!"
    echo "Current key: ${OPENAI_API_KEY:0:20}..."
else
    echo "Please enter your OpenAI API key:"
    read -s api_key

    if [ -z "$api_key" ]; then
        echo "❌ No API key provided. Exiting."
        exit 1
    fi

    # Set for current session
    export OPENAI_API_KEY="$api_key"
    echo ""
    echo "✅ API key set for current session"

    # Ask if they want to save it permanently
    echo ""
    echo "Would you like to save this API key permanently? (y/n)"
    read -n 1 -r save_permanently
    echo ""

    if [[ $save_permanently =~ ^[Yy]$ ]]; then
        echo "export OPENAI_API_KEY=\"$api_key\"" >> ~/.zshrc
        echo "✅ API key saved to ~/.zshrc"
        echo "It will be available in future terminal sessions."
    else
        echo "⚠️  API key set for current session only."
        echo "You'll need to set it again in new terminal sessions."
    fi
fi

echo ""
echo "🚀 Running setup validation..."
./setup_super_intelligence.sh

echo ""
echo "🎯 Ready to run demonstration!"
echo "Run: python cyrus_super_intelligence_demo.py"