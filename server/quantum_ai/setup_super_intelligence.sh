#!/bin/bash
# CYRUS Super-Intelligence Setup Script
# Configures environment for OpenAI-enhanced CYRUS super-intelligence

echo "🤖 CYRUS Super-Intelligence Setup"
echo "=================================="

# Check Python version
echo "Checking Python version..."
python3 --version
if [ $? -ne 0 ]; then
    echo "❌ Python 3 not found. Please install Python 3.12+"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check for OpenAI API key
echo ""
echo "🔑 OpenAI API Key Configuration"
echo "================================"

if [ -z "$OPENAI_API_KEY" ]; then
    echo "OpenAI API key not found in environment variables."
    echo ""
    echo "To set up your OpenAI API key:"
    echo "1. Get your API key from https://platform.openai.com/api-keys"
    echo "2. Run one of the following commands:"
    echo ""
    echo "   Option A - Temporary (current session only):"
    echo "   export OPENAI_API_KEY='your-api-key-here'"
    echo ""
    echo "   Option B - Permanent (add to your shell profile):"
    echo "   echo 'export OPENAI_API_KEY=\"your-api-key-here\"' >> ~/.bashrc"
    echo "   source ~/.bashrc"
    echo ""
    echo "   Option C - Create .env file:"
    echo "   echo 'OPENAI_API_KEY=your-api-key-here' > .env"
    echo ""
    read -p "Do you have your OpenAI API key ready? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your OpenAI API key: " api_key
        export OPENAI_API_KEY="$api_key"
        echo "✅ API key set for current session"
    else
        echo "⚠️  Please set your API key and run this script again"
        echo "   You can still explore the code without the API key"
    fi
else
    echo "✅ OpenAI API key found in environment"
fi

# Validate setup
echo ""
echo "🔍 Validating Setup"
echo "==================="

# Test imports
echo "Testing Python imports..."
python3 -c "
try:
    import openai
    print('✅ OpenAI library imported successfully')
except ImportError as e:
    print('❌ OpenAI library import failed:', e)
    exit(1)

try:
    from cyrus_openai_enhancer import CYRUSOpenAIKnowledgeEnhancer
    print('✅ CYRUS OpenAI Enhancer imported successfully')
except ImportError as e:
    print('❌ CYRUS OpenAI Enhancer import failed:', e)
    exit(1)

try:
    from cyrus_super_trainer import CYRUSSuperIntelligenceTrainer
    print('✅ CYRUS Super Trainer imported successfully')
except ImportError as e:
    print('❌ CYRUS Super Trainer import failed:', e)
    exit(1)

print('✅ All imports successful')
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo "You can now run the super-intelligence demonstration:"
    echo "python cyrus_super_intelligence_demo.py"
    echo ""
    echo "Or explore individual components:"
    echo "python -c \"from cyrus_super_trainer import CYRUSSuperIntelligenceTrainer; print('Ready!')\""
    echo ""
    echo "📚 For detailed documentation, see: SUPER_INTELLIGENCE_README.md"
else
    echo ""
    echo "❌ Setup validation failed. Please check the errors above."
    exit 1
fi

# Keep virtual environment activated for user
echo ""
echo "💡 Tip: To activate the virtual environment in future sessions:"
echo "source venv/bin/activate"