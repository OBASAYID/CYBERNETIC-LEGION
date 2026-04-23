#!/usr/bin/env bash
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║   ${BOLD}CYRUS v3.0${NC}${CYAN}                                            ║${NC}"
echo -e "${CYAN}║   Cybernetic Yielding Robust Unified System              ║${NC}"
echo -e "${CYAN}║   OMEGA-TIER Quantum Artificial Intelligence             ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║   Standalone Installation Script                         ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "  ${RED}[MISSING]${NC} $1 is not installed"
        return 1
    else
        local ver=""
        case "$1" in
            node) ver="$(node -v)" ;;
            npm) ver="v$(npm -v)" ;;
            python3) ver="$(python3 --version 2>&1 | awk '{print $2}')" ;;
            docker) ver="$(docker --version 2>&1 | awk '{print $3}' | tr -d ',')" ;;
            psql) ver="$(psql --version 2>&1 | awk '{print $3}')" ;;
        esac
        echo -e "  ${GREEN}[OK]${NC} $1 ${ver}"
        return 0
    fi
}

echo -e "${BOLD}[1/7] Checking system requirements${NC}"
echo ""

MISSING=0
check_command "node" || MISSING=1
check_command "npm" || MISSING=1
check_command "python3" || MISSING=1
echo ""
echo -e "  ${CYAN}Optional:${NC}"
check_command "docker" || true
check_command "psql" || true

if [ "$MISSING" -eq 1 ]; then
    echo ""
    echo -e "${RED}Required software is missing. Please install:${NC}"
    echo "  Node.js 18+  : https://nodejs.org/"
    echo "  Python 3.10+ : https://python.org/"
    echo ""
    exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo ""
    echo -e "${RED}Node.js 18+ required (found $(node -v))${NC}"
    exit 1
fi
echo ""

echo -e "${BOLD}[2/7] Configuring environment${NC}"
echo ""
if [ ! -f ".env" ]; then
    cp standalone/.env.example .env
    echo -e "  ${GREEN}Created${NC} .env from template"
    echo -e "  ${YELLOW}ACTION REQUIRED:${NC} Edit .env and set your API keys"
else
    echo -e "  ${GREEN}[OK]${NC} .env already exists"
fi
echo ""

echo -e "${BOLD}[3/7] Installing Node.js dependencies${NC}"
echo ""
if [ -f "package-lock.json" ]; then
    npm ci --loglevel=warn
else
    npm install --loglevel=warn
fi
echo ""

echo -e "${BOLD}[4/7] Setting up Python environment${NC}"
echo ""
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "  ${GREEN}Created${NC} Python virtual environment (.venv)"
fi
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
fi
pip install --quiet --upgrade pip 2>/dev/null || true
pip install --quiet numpy scipy scikit-learn networkx matplotlib pandas mmh3 nltk flask 2>/dev/null && {
    echo -e "  ${GREEN}[OK]${NC} Python packages installed"
} || {
    echo -e "  ${YELLOW}[WARN]${NC} Some Python packages failed. Quantum AI features may be limited."
}
echo ""

echo -e "${BOLD}[5/7] Checking database availability${NC}"
echo ""
HAS_DB=0
if command -v psql &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} PostgreSQL client available"
    HAS_DB=1
fi
if command -v docker &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Docker available (can run PostgreSQL via Docker Compose)"
    if [ "$HAS_DB" -eq 0 ]; then
        echo ""
        echo -e "  ${CYAN}To start PostgreSQL with Docker:${NC}"
        echo "    cd standalone && docker compose up -d postgres"
    fi
    HAS_DB=1
fi
if [ "$HAS_DB" -eq 0 ]; then
    echo -e "  ${YELLOW}[WARN]${NC} No PostgreSQL or Docker found"
    echo ""
    echo "  You need PostgreSQL. Options:"
    echo "    1. Install locally : https://www.postgresql.org/download/"
    echo "    2. Use Docker      : https://docs.docker.com/get-docker/"
    echo "    3. Hosted (Neon, Supabase, Railway, etc.)"
    echo "  Then set DATABASE_URL in .env"
fi
echo ""

echo -e "${BOLD}[6/7] Building frontend${NC}"
echo ""
npm run build 2>&1 | tail -5
echo ""

echo -e "${BOLD}[7/7] Database schema${NC}"
echo ""
if [ -f ".env" ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
fi
if [ -z "${DATABASE_URL:-}" ] || [ "${OPENAI_API_KEY:-}" = "sk-your-openai-api-key-here" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} Configure DATABASE_URL and OPENAI_API_KEY in .env first"
    echo -e "  Then run: ${CYAN}npx drizzle-kit push${NC}"
else
    npx drizzle-kit push --force 2>/dev/null && {
        echo -e "  ${GREEN}[OK]${NC} Database schema synchronized"
    } || {
        echo -e "  ${YELLOW}[WARN]${NC} Schema push failed. Ensure PostgreSQL is running"
        echo -e "  Then run: ${CYAN}npx drizzle-kit push${NC}"
    }
fi
echo ""

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║   ${GREEN}${BOLD}INSTALLATION COMPLETE${NC}${CYAN}                                  ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Remaining steps:${NC}"
echo ""
echo "  1. ${BOLD}Configure .env${NC} (if not done already)"
echo "     Required: OPENAI_API_KEY, DATABASE_URL"
echo "     Optional: ELEVENLABS_API_KEY, GOOGLE_MAPS_API_KEY"
echo ""
echo "  2. ${BOLD}Start PostgreSQL${NC} (if not running)"
echo "     Docker:  cd standalone && docker compose up -d postgres"
echo "     Manual:  createdb cyrus"
echo ""
echo "  3. ${BOLD}Push schema${NC} (if skipped above)"
echo "     npx drizzle-kit push"
echo ""
echo "  4. ${BOLD}Launch CYRUS${NC}"
echo "     npm run start:standalone"
echo ""
echo "  ${BOLD}Or deploy everything at once with Docker Compose:${NC}"
echo "     cd standalone && docker compose up -d"
echo ""
echo -e "  CYRUS will be available at: ${CYAN}http://localhost:5000${NC}"
echo ""
