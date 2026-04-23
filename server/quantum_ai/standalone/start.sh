#!/usr/bin/env bash
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  CYRUS v3.0 - OMEGA-TIER Quantum AI Humanoid System${NC}"
echo -e "${CYAN}  Standalone Launcher${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f ".env" ]; then
    echo -e "${RED}[ERROR] No .env file found${NC}"
    echo "  Run the installer first: bash standalone/install.sh"
    echo "  Or copy the template:    cp standalone/.env.example .env"
    exit 1
fi

set -a
source .env
set +a
echo -e "  ${GREEN}[OK]${NC} Environment loaded"

ERRORS=0
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "  ${RED}[ERROR] DATABASE_URL is not set in .env${NC}"
    ERRORS=1
fi
if [ -z "${OPENAI_API_KEY:-}" ] || [ "${OPENAI_API_KEY}" = "sk-your-openai-api-key-here" ]; then
    echo -e "  ${YELLOW}[WARN] OPENAI_API_KEY not configured - AI responses will be unavailable${NC}"
fi
if [ "$ERRORS" -eq 1 ]; then
    echo ""
    echo -e "${RED}Fix the errors above in .env and try again${NC}"
    exit 1
fi

if [ ! -d "dist" ] || [ ! -f "dist/public/index.html" ]; then
    echo -e "  ${YELLOW}[INFO] Frontend not built, building now...${NC}"
    npm run build
fi
echo -e "  ${GREEN}[OK]${NC} Frontend build verified"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate 2>/dev/null || true
    echo -e "  ${GREEN}[OK]${NC} Python venv activated"
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate 2>/dev/null || true
    echo -e "  ${GREEN}[OK]${NC} Python venv activated"
fi

export NODE_ENV=production
export PORT="${PORT:-5000}"

PIDS=()

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down CYRUS...${NC}"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo -e "${GREEN}CYRUS stopped${NC}"
}
trap cleanup EXIT INT TERM

echo ""
echo -e "  Starting Python services..."

if [ -f "server/quantum_ai/quantum_bridge.py" ]; then
    python3 server/quantum_ai/quantum_bridge.py &>/dev/null &
    PIDS+=($!)
    echo -e "  ${GREEN}[OK]${NC} Quantum AI Bridge (PID $!)"
fi

if [ -f "server/comms/ml_service.py" ]; then
    python3 server/comms/ml_service.py &>/dev/null &
    PIDS+=($!)
    echo -e "  ${GREEN}[OK]${NC} Comms ML Service (PID $!)"
fi

echo ""
echo -e "${GREEN}  Launching CYRUS on http://localhost:${PORT}${NC}"
echo ""

exec npx tsx server/index.ts
