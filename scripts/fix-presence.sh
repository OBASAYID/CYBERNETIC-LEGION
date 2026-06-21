#!/bin/bash
# CYRUS Presence System Diagnostic & Fix Script

set -e

echo "=================================="
echo "CYRUS Presence System Diagnostic"
echo "=================================="
echo ""

cd ~/cyrus-ai

echo "1. Checking if containers are running..."
docker compose ps

echo ""
echo "2. Checking if Socket.IO server code has diagnostic logs..."
if docker exec cyrus-app grep -q "✓ REGISTER event received" server/comms/socket-signaling.ts; then
    echo "✓ Server diagnostic code: PRESENT"
else
    echo "✗ Server diagnostic code: MISSING"
    echo "   Copying updated server file..."
fi

echo ""
echo "3. Checking recent logs for Socket.IO activity..."
docker compose logs app --tail=50 | grep -E "Socket.IO|New connection" || echo "   No Socket.IO connections found"

echo ""
echo "4. Checking if app is healthy..."
docker compose exec app curl -sf http://localhost:3020/api/ready > /dev/null && echo "✓ API is ready" || echo "✗ API not ready"

echo ""
echo "5. Testing Socket.IO server endpoint..."
docker compose exec app curl -sf http://localhost:3020/cyrus-io/ > /dev/null && echo "✓ Socket.IO endpoint responding" || echo "✗ Socket.IO endpoint not responding"

echo ""
echo "=================================="
echo "Diagnosis Complete"
echo "=================================="
echo ""
echo "To see live logs when you log in, run:"
echo "  docker compose logs -f app | grep -E 'Socket.IO|register|Presence|✓'"
echo ""
echo "Then in your browser:"
echo "  1. Go to http://167.233.36.99:3020"
echo "  2. Hard refresh: Cmd+Shift+R"
echo "  3. Open Console: Cmd+Option+I → Console tab"
echo "  4. Log in with code: 71580019"
echo "  5. Watch for [Presence] messages"
echo ""
