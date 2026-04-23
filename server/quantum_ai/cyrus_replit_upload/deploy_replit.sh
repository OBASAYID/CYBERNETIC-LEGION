#!/bin/bash

# CYRUS AI System - Replit Deployment Script
echo "🚀 CYRUS AI System - Replit Deployment"
echo "====================================="

# Check if we're in Replit environment
if [ -z "$REPL_ID" ]; then
    echo "❌ Not running in Replit environment"
    echo "Please run this in your Replit project"
    exit 1
fi

echo "✅ Running in Replit environment"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install flask flask-cors requests

# Check for required secrets
echo "🔐 Checking secrets..."
if [ -z "$OPENAI_API_KEY" ] && [ -z "$AI_INTEGRATIONS_OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY not set"
    echo "Please add your OpenAI API key in Replit Secrets"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET not set"
    echo "Please generate and add a session secret in Replit Secrets"
    exit 1
fi

echo "✅ All required secrets configured"

# Start the server
echo "🚀 Starting CYRUS AI System..."
echo "🌐 Your app will be available at: https://$REPL_SLUG.$REPL_OWNER.repl.co"
echo ""
python simple_flask_server.py
