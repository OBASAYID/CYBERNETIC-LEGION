#!/bin/bash

echo "🚀 Setting up Ollama for CYRUS OpenAI Independence"
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
fi

echo "🤖 Pulling required models..."
ollama pull llama3.2:3b
ollama pull mistral:7b
ollama pull qwen2.5:7b

echo "✅ Ollama setup complete!"
echo ""
echo "To start Ollama service:"
echo "  ollama serve"
echo ""
echo "Models available:"
echo "  - llama3.2:3b (fast analysis)"
echo "  - mistral:7b (chat)"
echo "  - qwen2.5:7b (multilingual)"