#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_ROOT="${CYRUS_SERVICE_ROOT:-$HOME/cyrus-service}"
AGENT_DIR="$HOME/Library/LaunchAgents"
AGENT_PATH="$AGENT_DIR/com.cyrus.server.plist"
LOG_DIR="$SERVICE_ROOT/logs/runtime"

mkdir -p "$AGENT_DIR" "$LOG_DIR"

bash "$ROOT_DIR/script/sync-production-bundle.sh"

cat > "$AGENT_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.cyrus.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SERVICE_ROOT/script/start-production.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$SERVICE_ROOT</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>3105</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/launchd.err.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)"/com.cyrus.server >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$AGENT_PATH"
launchctl enable "gui/$(id -u)"/com.cyrus.server
launchctl kickstart -k "gui/$(id -u)"/com.cyrus.server

echo "Installed launch agent at $AGENT_PATH"
