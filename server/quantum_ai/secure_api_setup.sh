#!/bin/bash
# Secure OpenAI API Key Setup for CYRUS Super-Intelligence

echo "🔐 Secure OpenAI API Key Setup"
echo "=============================="
echo "This will securely configure your OpenAI API key for CYRUS."
echo ""

# Check if already set
if [ -n "$OPENAI_API_KEY" ]; then
    echo "⚠️  OpenAI API key is already set in environment."
    echo "Current key: ${OPENAI_API_KEY:0:20}..."
    echo ""
    read -p "Do you want to replace it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing key."
        exit 0
    fi
fi

# Securely prompt for API key
echo "Please enter your OpenAI API key:"
echo "💡 You can find it at: https://platform.openai.com/api-keys"
echo ""
read -s -p "API Key: " api_key
echo ""

# Validate the key format (basic check)
if [[ ! $api_key =~ ^sk- ]]; then
    echo "❌ Invalid API key format. OpenAI keys should start with 'sk-'"
    exit 1
fi

if [ ${#api_key} -lt 50 ]; then
    echo "❌ API key seems too short. Please check and try again."
    exit 1
fi

echo "✅ API key format validated"

# Ask where to save it
echo ""
echo "Where would you like to save the API key?"
echo "1) Environment variable (current session only)"
echo "2) Shell profile (~/.zshrc - permanent)"
echo "3) .env file (project-specific)"
echo "4) Keychain (macOS secure storage)"
read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo "Setting API key for current session..."
        export OPENAI_API_KEY="$api_key"
        echo "✅ API key set for current session"
        echo "⚠️  Remember to set it again in new terminal sessions"
        ;;
    2)
        echo "Adding to ~/.zshrc for permanent access..."
        echo "export OPENAI_API_KEY=\"$api_key\"" >> ~/.zshrc
        source ~/.zshrc
        echo "✅ API key saved to ~/.zshrc"
        echo "It will be available in all future terminal sessions"
        ;;
    3)
        echo "Creating .env file..."
        echo "OPENAI_API_KEY=$api_key" > .env
        echo "✅ API key saved to .env file"
        echo "Make sure .env is in your .gitignore to keep it secure!"
        ;;
    4)
        echo "Saving to macOS Keychain..."
        security add-generic-password -a "$USER" -s "openai_api_key" -w "$api_key" -U
        echo "✅ API key saved to macOS Keychain"
        echo "To retrieve it later: security find-generic-password -a $USER -s openai_api_key -w"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🔍 Testing API key configuration..."

# Test the configuration
if [ "$choice" = "4" ]; then
    # For keychain, retrieve and test
    test_key=$(security find-generic-password -a "$USER" -s "openai_api_key" -w 2>/dev/null)
    if [ $? -eq 0 ]; then
        export OPENAI_API_KEY="$test_key"
        echo "✅ Retrieved API key from Keychain"
    else
        echo "❌ Failed to retrieve API key from Keychain"
        exit 1
    fi
fi

# Test with a simple Python script
python3 -c "
import os
import sys
sys.path.insert(0, 'server/quantum_ai')
try:
    from cyrus_openai_enhancer import CYRUSOpenAIKnowledgeEnhancer
    enhancer = CYRUSOpenAIKnowledgeEnhancer()
    print('✅ API key validated - CYRUS super-intelligence ready!')
except Exception as e:
    print(f'❌ API key validation failed: {e}')
    sys.exit(1)
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup Complete!"
    echo "================="
    echo "Your OpenAI API key is securely configured."
    echo ""
    echo "🚀 You can now run:"
    echo "python knowledge_demo.py    # Test knowledge acquisition"
    echo "python simple_demo.py       # Basic functionality test"
    echo ""
    echo "For the full experience, run the comprehensive demo:"
    echo "cd server/quantum_ai && python cyrus_super_intelligence_demo.py"
else
    echo ""
    echo "❌ Setup failed. Please check your API key and try again."
    exit 1
fi