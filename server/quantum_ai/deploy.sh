#!/bin/bash

# CYRUS AI System Deployment Script
# Version: 3.0 - OpenAI Independent with Local AI Support
# Date: March 2, 2026

echo "🚀 CYRUS v3.0 - OpenAI Independent Deployment"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "pyproject.toml" ]; then
    print_error "Not in CYRUS project directory. Please run from the project root."
    exit 1
fi

print_status "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $1 is already in use. Attempting to free it..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

print_status "Checking port availability..."
check_port 5001
check_port 5002
check_port 5051

# Install Python dependencies
print_status "Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt 2>/dev/null || print_warning "Some Python dependencies may be missing"

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build the frontend (optional)
print_status "Building frontend..."
npm run build 2>/dev/null || print_warning "Frontend build failed, but continuing..."

# Start the system
print_success "Starting CYRUS AI System..."
print_status "Launching services:"
print_status "  - Quantum Bridge (Port 5001)"
print_status "  - ML Service (Port 5002)"
print_status "  - Main Server (Port 5051)"

# Start services in background
npm run dev &
SERVER_PID=$!

# Wait a moment for services to start
sleep 5

# Check if services are running
print_status "Verifying deployment..."

if curl -s http://localhost:5051/health/live > /dev/null 2>&1; then
    print_success "✅ Main server is running on port 5051"
else
    print_error "❌ Main server failed to start"
fi

if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    print_success "✅ Quantum Bridge is running on port 5001"
else
    print_warning "⚠️  Quantum Bridge status unknown"
fi

if curl -s http://localhost:5002/health > /dev/null 2>&1; then
    print_success "✅ ML Service is running on port 5002"
else
    print_warning "⚠️  ML Service status unknown"
fi

# Get system status
BRANCH_COUNT=$(curl -s http://localhost:5051/api/cyrus/domains 2>/dev/null | grep -o '"totalBranches":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "unknown")

echo ""
print_success "🎉 CYRUS v3.0 Deployment Complete!"
echo ""
echo -e "${BLUE}System Information:${NC}"
echo "  - Cognitive Branches: $BRANCH_COUNT"
echo "  - Main Server: http://localhost:5051"
echo "  - Quantum Bridge: http://localhost:5001"
echo "  - ML Service: http://localhost:5002"
echo ""
echo -e "${YELLOW}To stop the system, press Ctrl+C or run:${NC}"
echo "  kill $SERVER_PID"
echo ""
echo -e "${GREEN}CYRUS is now ready for human-like interaction! 🤖💬${NC}"

# Wait for user interrupt
trap "echo ''; print_status 'Shutting down CYRUS...'; kill $SERVER_PID 2>/dev/null; exit 0" INT
wait $SERVER_PID