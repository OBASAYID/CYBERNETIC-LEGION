# CYRUS Presence System Diagnostic Report

## Issue Summary
Users can log in successfully, but the presence system shows them as "offline" instead of "online". No Socket.IO connections are being established.

## Root Cause Analysis

### 1. Architecture Overview
The presence system has the correct structure:
- `PresenceProvider` wraps the app (✓)
- `CommsPresenceBootstrap` component renders after authentication (✓)
- Server has Socket.IO initialized on path `/cyrus-io` (✓)
- Server has diagnostic logging with ✓ checkmarks (✓)

### 2. Current Symptoms
- **Server logs**: NO Socket.IO activity at all
- **No connection attempts**: No `[Socket.IO] New connection` logs
- **No register events**: No `[Socket.IO] ✓ REGISTER event received` logs
- **Pages load**: HTTP requests work (`/api/stack/summary`, `/registerSW.js`)

### 3. Probable Cause
The **client-side diagnostic code** was added to TypeScript source files, but the **Docker build cached the old JavaScript**. The browser is still running the old code without the diagnostic logs.

## Diagnostic Steps

### Check 1: Verify Server Has Diagnostic Code
```bash
docker exec cyrus-app grep "✓ REGISTER event received" server/comms/socket-signaling.ts
```
**Expected**: Should show a line with the diagnostic message
**Result**: ✓ PASSED - Server code is updated

### Check 2: Check if Client Code Was Compiled
The client TypeScript gets compiled to JavaScript during `npm run build`. The diagnostic code should be in the compiled output, but Docker may have cached the old build.

### Check 3: Browser Console Inspection
**What to look for:**
1. Press F12 → Console tab
2. Look for `[Presence]` messages
3. Look for Socket.IO connection errors
4. Look for any red error messages

## Solution

The Docker build process compiles TypeScript to JavaScript. The updated client code needs to be rebuilt fresh.

### Fix Steps

1. **Copy the latest files from local to server** (already done ✓)
2. **Force a clean rebuild without Docker cache**
3. **Verify the compiled JavaScript contains the diagnostic code**
4. **Clear browser cache and test**

### Commands to Run on Server

```bash
cd ~/cyrus-ai

# Stop containers
docker compose down

# Remove the old image completely
docker rmi cyrus-ai-app

# Build fresh with no cache
docker compose build --no-cache app

# Start
docker compose up -d

# Watch for diagnostic logs
docker compose logs -f app 2>&1 | grep --line-buffered -E "Socket.IO|register|✓|Presence"
```

## Expected Behavior After Fix

### Server Logs Should Show:
```
[Socket.IO] New connection: <socket-id>
[Socket.IO] ✓ REGISTER event received: {"userId":"...","displayName":"delta uniform 00","deviceId":"..."}
[Socket.IO] ✓ User registered: delta uniform 00 (...) - Total: 1
[Socket.IO] ✓ Emitting "registered" to socket <socket-id>
[Socket.IO] ✓ Broadcasting "users-list" with 1 users: delta uniform 00
```

### Browser Console Should Show:
```
[Presence] Connecting Socket.IO to: http://167.233.36.99:3020 (account=..., device=...)
[Presence] CONNECTED - Socket ID: <socket-id>
[Presence] ✓ Emitting 'register' event: {"userId":"...","displayName":"delta uniform 00",...}
[Presence] ✓ Received 'registered' event: {"userId":"...","totalOnline":1}
[Presence] ✓ Received 'users-list' with 1 users: delta uniform 00
```

## Additional Checks

### If Still Not Working After Rebuild:

1. **Check browser console for errors**:
   - F12 → Console tab
   - Look for Socket.IO connection errors
   - Look for CORS errors
   - Look for network errors

2. **Check if Socket.IO client library loaded**:
   In browser console, run:
   ```javascript
   typeof io
   ```
   Should return `"function"`. If `"undefined"`, Socket.IO client isn't loaded.

3. **Verify Socket.IO path**:
   Server uses `/cyrus-io` (line 784 in socket-signaling.ts)
   Client should connect to: `http://167.233.36.99:3020` with path `/cyrus-io`

4. **Check firewall/networking**:
   - WebSocket connections on port 3020 should be allowed
   - Try connecting from local network vs external

## Files Modified (Already Deployed)
- ✓ `server/comms/socket-signaling.ts` - Enhanced server diagnostic logging
- ✓ `client/src/contexts/PresenceContext.tsx` - Enhanced client diagnostic logging

## Next Steps
1. Run the fix commands above
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Log in with code 71580019
4. Check both server logs and browser console
5. Report what you see in both places
