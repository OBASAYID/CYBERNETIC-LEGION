// CYRUS Video Call Test Script
// Copy and paste this into your browser console (F12) when on the app

console.log('🎥 CYRUS Video Call Diagnostic Starting...\n');

// Test 1: Check if camera is available
async function testCamera() {
  console.log('📹 Test 1: Checking camera availability...');
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    
    if (videoInputs.length === 0) {
      console.error('❌ No camera detected!');
      return false;
    }
    
    console.log(`✅ Found ${videoInputs.length} camera(s):`);
    videoInputs.forEach((device, i) => {
      console.log(`   ${i + 1}. ${device.label || 'Camera ' + (i + 1)}`);
    });
    return true;
  } catch (err) {
    console.error('❌ Error checking cameras:', err);
    return false;
  }
}

// Test 2: Check camera permission
async function testCameraPermission() {
  console.log('\n🔐 Test 2: Checking camera permission...');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    console.log('✅ Camera permission granted!');
    console.log('   Video tracks:', stream.getVideoTracks().length);
    stream.getTracks().forEach(track => {
      console.log(`   - ${track.kind}: ${track.label} (${track.readyState})`);
      track.stop();
    });
    return true;
  } catch (err) {
    console.error('❌ Camera permission denied or error:', err.name, err.message);
    if (err.name === 'NotAllowedError') {
      console.log('   💡 Solution: Grant camera permission in browser settings');
    } else if (err.name === 'NotFoundError') {
      console.log('   💡 Solution: Connect a camera to your device');
    }
    return false;
  }
}

// Test 3: Check if in a call
function testCallState() {
  console.log('\n📞 Test 3: Checking call state...');
  
  const localVideo = document.querySelector('[data-cyrus-local-pip="1"]');
  const remoteVideo = document.querySelector('[data-cyrus-remote-call="1"]');
  
  if (!localVideo && !remoteVideo) {
    console.log('ℹ️  Not currently in a call');
    return false;
  }
  
  console.log('✅ In a call:');
  
  if (localVideo) {
    console.log('   Local video element:', {
      hasStream: !!localVideo.srcObject,
      videoTracks: localVideo.srcObject?.getVideoTracks().length || 0,
      playing: !localVideo.paused,
    });
    
    if (localVideo.srcObject) {
      localVideo.srcObject.getVideoTracks().forEach(track => {
        console.log(`   - Local track: ${track.label}`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });
    }
  } else {
    console.log('   ⚠️  No local video element found');
  }
  
  if (remoteVideo) {
    console.log('   Remote video element:', {
      hasStream: !!remoteVideo.srcObject,
      videoTracks: remoteVideo.srcObject?.getVideoTracks().length || 0,
      playing: !remoteVideo.paused,
    });
    
    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getVideoTracks().forEach(track => {
        console.log(`   - Remote track: ${track.label}`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });
    }
  } else {
    console.log('   ℹ️  No remote video element found (may be audio-only or group call)');
  }
  
  return true;
}

// Test 4: Check WebRTC support
function testWebRTCSupport() {
  console.log('\n🌐 Test 4: Checking WebRTC support...');
  
  const checks = {
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    RTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
    mediaDevices: !!navigator.mediaDevices,
  };
  
  const allSupported = Object.values(checks).every(v => v);
  
  if (allSupported) {
    console.log('✅ WebRTC fully supported');
  } else {
    console.log('❌ WebRTC not fully supported:');
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    });
  }
  
  return allSupported;
}

// Test 5: Check for common blocking issues
function testCommonIssues() {
  console.log('\n🔍 Test 5: Checking for common issues...');
  
  const issues = [];
  
  // Check protocol
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push('⚠️  Not on HTTPS - getUserMedia requires HTTPS or localhost');
  } else {
    console.log('✅ Protocol OK (HTTPS or localhost)');
  }
  
  // Check if insecure context
  if (!window.isSecureContext) {
    issues.push('❌ Insecure context - getUserMedia will fail');
  } else {
    console.log('✅ Secure context');
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.forEach(issue => console.log('   ' + issue));
  } else {
    console.log('✅ No common blocking issues detected');
  }
  
  return issues.length === 0;
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  CYRUS VIDEO CALL DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════\n');
  
  const results = {
    webrtcSupport: testWebRTCSupport(),
    commonIssues: testCommonIssues(),
    cameraAvailable: await testCamera(),
    cameraPermission: await testCameraPermission(),
    callState: testCallState(),
  };
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════\n');
  
  const allPassed = Object.entries(results).every(([key, value]) => {
    if (key === 'callState') return true; // Optional
    return value;
  });
  
  if (allPassed) {
    console.log('✅ All critical tests passed!');
    console.log('\nVideo calls should work. If they don\'t:');
    console.log('1. Make sure you\'re calling another online user');
    console.log('2. Check that both users grant camera permission');
    console.log('3. Open console on BOTH devices to see errors');
  } else {
    console.log('❌ Some tests failed. See above for details.');
    console.log('\nTo fix:');
    if (!results.webrtcSupport) {
      console.log('  - Update your browser to the latest version');
    }
    if (!results.cameraAvailable) {
      console.log('  - Connect a camera to your device');
    }
    if (!results.cameraPermission) {
      console.log('  - Grant camera permission in browser settings');
      console.log('  - Close other apps using the camera (Zoom, Teams, etc.)');
    }
  }
  
  console.log('\n═══════════════════════════════════════════════\n');
  
  return results;
}

// Run the diagnostic
runAllTests().catch(err => {
  console.error('❌ Diagnostic failed:', err);
});
