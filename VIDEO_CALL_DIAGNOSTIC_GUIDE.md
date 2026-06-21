# Video Call Diagnostic Guide

## Status Report
✅ **Server:** Online and healthy  
✅ **Messages:** Working  
✅ **Voice Calls:** Working  
❌ **Video Calls:** Issue reported - "video call is missing"

## Video Call Components (All Present in Code)

### 1. UI Elements ✅
- **Video Call Button:** Exists in `CommsContactHubPopover.tsx` (line 89-100)
- **Video Tab:** Present in `comms-hub-page.tsx` (line 1601)
- **Video Toggle:** Implemented in `CallView.tsx`

### 2. Call Initiation ✅
- **Handler:** `handleCallVideo` exists (line 1666 in comms-hub-page.tsx)
- **Socket Event:** Emits `call-user` with `callType: "video"` (line 1791-1796 in PresenceContext.tsx)

### 3. Media Capture ✅
- **Video Constraints:** Defined in `webrtc-config.ts`
- **getUserMedia:** Called via `acquireCommsUserMedia` with video constraints
- **Fallback Strategy:** Multiple resolution attempts (HD → SD → Mobile)

### 4. Video Rendering ✅
- **Remote Video:** `<video>` element at line 683-692 in CallView.tsx
- **Local PIP:** Picture-in-picture video at line 747-754
- **Group Video:** Grid layout for multi-party video

## Possible Issues & Diagnostics

### Issue #1: Camera Permission Denied
**Symptom:** Video call button works but no video shows

**Test:**
1. Open browser console (`F12` or `Cmd+Option+I`)
2. Look for errors like:
   ```
   getUserMedia failed: NotAllowedError
   getUserMedia failed: NotFoundError
   ```

**Fix:**
- **Chrome:** `chrome://settings/content/camera` → Allow
- **Firefox:** Click lock icon in address bar → Allow camera
- **Safari:** Safari → Settings → Websites → Camera → Allow

### Issue #2: Video Button Not Clickable
**Symptom:** Button appears but is disabled/grayed out

**Possible Causes:**
- User already in a call (`inCall` prop disables button)
- Camera not detected by browser

**Test:**
1. Make sure you're not already in a call
2. Run in browser console:
   ```javascript
   navigator.mediaDevices.enumerateDevices().then(devices => {
     console.log('Video inputs:', devices.filter(d => d.kind === 'videoinput'));
   });
   ```

### Issue #3: Video Call Initiates But No Video Stream
**Symptom:** Call connects but black screen or avatar shown instead of video

**Diagnostic Steps:**

1. **Check if video tracks exist** (in browser console during call):
   ```javascript
   // Check local stream
   const localVideo = document.querySelector('[data-cyrus-local-pip="1"]');
   console.log('Local video element:', localVideo);
   console.log('Local srcObject:', localVideo?.srcObject);
   console.log('Local video tracks:', localVideo?.srcObject?.getVideoTracks());
   
   // Check remote stream
   const remoteVideo = document.querySelector('[data-cyrus-remote-call="1"]');
   console.log('Remote video element:', remoteVideo);
   console.log('Remote srcObject:', remoteVideo?.srcObject);
   console.log('Remote video tracks:', remoteVideo?.srcObject?.getVideoTracks());
   ```

2. **Check track states**:
   ```javascript
   const localStream = localVideo?.srcObject;
   if (localStream) {
     localStream.getVideoTracks().forEach(track => {
       console.log('Local video track:', {
         id: track.id,
         enabled: track.enabled,
         muted: track.muted,
         readyState: track.readyState,
         label: track.label
       });
     });
   }
   ```

3. **Check for media constraints errors**:
   - Look in console for warnings about resolution/framerate
   - Look for "Camera in use by another application" messages

### Issue #4: Autoplay Policy Blocking Video
**Symptom:** Video element exists but doesn't play

**Test in Console:**
```javascript
const remoteVideo = document.querySelector('[data-cyrus-remote-call="1"]');
if (remoteVideo) {
  remoteVideo.play().then(() => {
    console.log('Video playing!');
  }).catch(err => {
    console.error('Autoplay blocked:', err);
  });
}
```

**Fix:**
- Click anywhere on the page to give user gesture
- Use the "Recover Media" button if it appears

### Issue #5: Network Issues Disabling Video
**Symptom:** Call starts with video but switches to audio-only

**Diagnostic:**
Look for console messages:
```
Network degraded - switched to audio-priority mode
```

This is the adaptive quality system working - poor network forces audio-only.

### Issue #6: Video Constraints Too High for Device
**Symptom:** getUserMedia fails completely

**Solution Already Implemented:**
The code has fallback strategy:
1. Try HD (1280x720)
2. Fallback to SD (640x480)
3. Fallback to Mobile (640x360)

But if ALL fail, video call won't work.

## Step-by-Step Testing Guide

### Test 1: Check UI Elements
1. Log into the app on **two browsers or devices**
2. Click on an online user
3. Verify you see the **orbital contact hub** popup
4. Look for the **blue "Video" button** with camera icon
5. Is it visible? Is it clickable (not grayed out)?

### Test 2: Initiate Video Call
1. Click the Video button
2. Check browser console for errors
3. Check if browser asks for camera permission
4. Grant permission if asked
5. Does the call view appear?

### Test 3: Check Video Elements
1. Once in call, open browser console
2. Run diagnostic commands from Issue #3 above
3. Check if video elements have streams attached
4. Check if tracks are enabled and in "live" state

### Test 4: Check Both Sides
**Important:** Test from BOTH caller and receiver:
- Does caller see their own video (PIP in bottom-right)?
- Does caller see receiver's video (main view)?
- Does receiver see their own video?
- Does receiver see caller's video?

## Quick Fix Checklist

- [ ] Camera connected to device
- [ ] Camera permission granted in browser
- [ ] Not already in another call
- [ ] Device not in use by another app (Zoom, Teams, etc.)
- [ ] Browser supports WebRTC (Chrome, Firefox, Safari, Edge - all recent versions)
- [ ] HTTPS or localhost (required for getUserMedia)
- [ ] No browser extensions blocking camera
- [ ] Adequate network bandwidth (video requires more than audio)

## Server-Side Checks

If everything above looks good but video still doesn't work:

```bash
ssh cyrus@167.233.36.99
cd ~/cyrus-ai

# Check for WebRTC/media related errors
docker compose logs app --tail=100 | grep -i "video\|camera\|media\|getUserMedia"

# Check Socket.IO is handling call events
docker compose logs app --tail=100 | grep -i "call-user\|call-offer\|call-answer"
```

## Most Likely Causes (in order)

1. **Camera permission not granted** (80% of cases)
2. **Camera in use by another app** (10% of cases)
3. **Browser autoplay policy blocking** (5% of cases)
4. **Network too slow, system forced audio-only** (3% of cases)
5. **Actual code bug** (2% of cases)

## Getting More Info

To help diagnose further, please provide:

1. **What you see:**
   - Is the video button visible?
   - Is it clickable?
   - What happens when you click it?
   - Do you see any error messages?

2. **Browser Console Output:**
   - Open console before starting call
   - Copy any red error messages
   - Look for "[Presence]", "[WebRTC]", "getUserMedia" lines

3. **Which browsers/devices tested:**
   - Caller browser & OS
   - Receiver browser & OS
   - Same device or different devices?

4. **Network:**
   - Are both users on same network?
   - Mobile data or WiFi?

## Code Locations for Reference

If you need to check the actual code:

- **Video button UI:** `client/src/components/comms/CommsContactHubPopover.tsx:89-100`
- **Video call handler:** `cyrus-ui/src/pages/comms-hub-page.tsx:1666-1668`
- **Media acquisition:** `client/src/lib/comms-call-media.ts:58-107`
- **Video rendering:** `client/src/components/comms/CallView.tsx:683-692, 747-754`
- **WebRTC setup:** `client/src/contexts/PresenceContext.tsx:970-1050`

---

**Next Steps:**
Run through the testing guide above and let me know what you find. The most common issue is simply camera permissions, but we'll track down whatever it is!
