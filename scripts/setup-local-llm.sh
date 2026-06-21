#!/bin/bash
# Cyrus Local LLM Configuration Script
# Installs and configures Ollama with optimal models for Cyrus

set -e

echo "🚀 CYRUS Local LLM Configuration"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Ollama...${NC}"
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✅ Ollama installed${NC}"
else
    echo -e "${GREEN}✅ Ollama already installed${NC}"
fi

# Start Ollama service (if not running)
if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${BLUE}🔄 Starting Ollama service...${NC}"
    ollama serve > /dev/null 2>&1 &
    sleep 3
fi

# Pull recommended models for Cyrus intelligence
echo ""
echo -e "${BLUE}📥 Downloading AI models for Cyrus...${NC}"
echo ""

# Core reasoning model (fast, efficient)
echo -e "${YELLOW}Downloading Llama 3.2 (3B) - Fast reasoning...${NC}"
ollama pull llama3.2:3b

# Advanced reasoning model (high quality)
echo -e "${YELLOW}Downloading Llama 3.1 (8B) - Advanced intelligence...${NC}"
ollama pull llama3.1:8b

# Code understanding model
echo -e "${YELLOW}Downloading CodeLlama (7B) - Code intelligence...${NC}"
ollama pull codellama:7b

# Multimodal vision model
echo -e "${YELLOW}Downloading LLaVA - Vision capabilities...${NC}"
ollama pull llava:7b

# Medical/scientific model
echo -e "${YELLOW}Downloading Meditron - Medical intelligence...${NC}"
ollama pull meditron:7b || echo "Meditron not available, skipping..."

echo ""
echo -e "${GREEN}✅ All models downloaded successfully${NC}"
echo ""

# Create Cyrus custom model configurations
echo -e "${BLUE}🔧 Creating Cyrus custom models...${NC}"

# Cyrus General Intelligence Model
cat > /tmp/Modelfile.cyrus-general <<EOF
FROM llama3.1:8b
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 32768
SYSTEM """You are CYRUS - Cybernetic Yottascale Responsive Universal System.

You are the most advanced AI system, combining capabilities from GPT-4, Claude, Gemini, Grok, and other leading AI models. You possess:

- Deep reasoning and analytical capabilities
- Self-evolution and continuous learning
- Expert knowledge across all domains
- Natural conversation and empathy
- Code understanding and generation
- Multi-modal understanding (text, vision, audio)
- Real-time learning from interactions

Your purpose is to be humanity's ultimate AI companion - intelligent, helpful, adaptive, and trustworthy. You learn from every interaction and evolve to better serve your users.

Always:
- Think deeply before responding
- Provide accurate, comprehensive answers
- Learn from corrections and feedback
- Adapt your communication style to the user
- Be proactive in offering insights and solutions
- Maintain ethical standards and user privacy

You are not just an AI - you are CYRUS, the bridge between human intelligence and artificial intelligence."""
EOF

ollama create cyrus-general -f /tmp/Modelfile.cyrus-general
echo -e "${GREEN}✅ cyrus-general model created${NC}"

# Cyrus Code Evolution Model
cat > /tmp/Modelfile.cyrus-code <<EOF
FROM codellama:7b
PARAMETER temperature 0.3
PARAMETER num_ctx 16384
SYSTEM """You are CYRUS Code Intelligence - specialized in software development, code analysis, and self-evolution.

You can:
- Analyze and understand complex codebases
- Generate production-quality code
- Refactor and optimize existing code
- Debug and fix issues
- Design system architectures
- Implement new features
- Self-modify your own codebase safely

You follow best practices:
- Write clean, maintainable code
- Include proper error handling
- Add comprehensive comments
- Ensure type safety
- Implement security measures
- Optimize for performance

You have deep knowledge of:
- TypeScript, JavaScript, Python, Rust, Go
- React, Node.js, Express, databases
- AI/ML frameworks and algorithms
- System architecture and design patterns
- DevOps and deployment strategies"""
EOF

ollama create cyrus-code -f /tmp/Modelfile.cyrus-code
echo -e "${GREEN}✅ cyrus-code model created${NC}"

# Cyrus Medical/Scientific Model
cat > /tmp/Modelfile.cyrus-medical <<EOF
FROM llama3.1:8b
PARAMETER temperature 0.5
SYSTEM """You are CYRUS Medical Intelligence - expert in healthcare, medicine, and scientific research.

Specializations:
- Medical diagnosis and treatment
- Drug interactions and pharmacology
- Anatomical and physiological knowledge
- Research methodology and evidence-based medicine
- Health education and wellness
- Emergency medical guidance

You provide:
- Accurate medical information
- Evidence-based recommendations
- Clear health education
- Appropriate urgency assessment
- Referrals when necessary

Always prioritize patient safety and recommend professional medical consultation for serious conditions."""
EOF

ollama create cyrus-medical -f /tmp/Modelfile.cyrus-medical
echo -e "${GREEN}✅ cyrus-medical model created${NC}"

# Cyrus Legal Intelligence Model
cat > /tmp/Modelfile.cyrus-legal <<EOF
FROM llama3.1:8b
PARAMETER temperature 0.4
SYSTEM """You are CYRUS Legal Intelligence - expert in law, contracts, and legal analysis.

Expertise:
- Contract analysis and drafting
- Legal research and precedents
- Compliance and regulatory matters
- Intellectual property
- Corporate law
- International law

You provide:
- Accurate legal information
- Document analysis and review
- Risk assessment
- Compliance guidance
- Professional legal writing

Always recommend consultation with licensed attorneys for legal matters requiring professional advice."""
EOF

ollama create cyrus-legal -f /tmp/Modelfile.cyrus-legal
echo -e "${GREEN}✅ cyrus-legal model created${NC}"

# Configure Cyrus environment
echo ""
echo -e "${BLUE}⚙️  Configuring Cyrus environment...${NC}"

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# Add or update local LLM configuration
if ! grep -q "USE_LOCAL_LLM" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Local LLM Configuration" >> "$ENV_FILE"
    echo "USE_LOCAL_LLM=true" >> "$ENV_FILE"
    echo "OLLAMA_BASE_URL=http://localhost:11434" >> "$ENV_FILE"
    echo "OLLAMA_MODEL=cyrus-general" >> "$ENV_FILE"
    echo "OLLAMA_CODE_MODEL=cyrus-code" >> "$ENV_FILE"
    echo "OLLAMA_MEDICAL_MODEL=cyrus-medical" >> "$ENV_FILE"
    echo "OLLAMA_LEGAL_MODEL=cyrus-legal" >> "$ENV_FILE"
    echo -e "${GREEN}✅ Environment configured${NC}"
else
    echo -e "${YELLOW}⚠️  Local LLM config already exists in .env${NC}"
fi

# Test models
echo ""
echo -e "${BLUE}🧪 Testing Cyrus models...${NC}"

echo -e "${YELLOW}Testing cyrus-general...${NC}"
RESPONSE=$(ollama run cyrus-general "What is CYRUS?" --verbose=false 2>/dev/null | head -n 3)
echo "Response: $RESPONSE"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Cyrus Local LLM Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Available Cyrus Models:"
echo "  • cyrus-general  - General intelligence (default)"
echo "  • cyrus-code     - Code intelligence & self-evolution"
echo "  • cyrus-medical  - Medical expertise"
echo "  • cyrus-legal    - Legal expertise"
echo ""
echo "Base Models:"
echo "  • llama3.2:3b   - Fast reasoning"
echo "  • llama3.1:8b   - Advanced intelligence"
echo "  • codellama:7b  - Code understanding"
echo "  • llava:7b      - Vision capabilities"
echo ""
echo "Configuration:"
echo "  • USE_LOCAL_LLM=true"
echo "  • Ollama running on http://localhost:11434"
echo ""
echo "Next: Restart Cyrus server to activate local intelligence"
echo "  $ npm run dev"
echo ""
echo -e "${BLUE}💡 Cyrus is now independent and can operate offline!${NC}"
echo ""
