# CYRUS AI - Mobile App Configuration Guide

## Overview

CYRUS AI is now configured as a portable mobile application that works across **iOS**, **Android**, and **web browsers**. This guide explains how to build, deploy, and maintain the mobile apps.

## Architecture

```
┌─────────────────────────────────────────────────┐
│           CYRUS AI Mobile Stack                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐│
│  │   iOS App   │  │ Android App │  │ Web/PWA ││
│  │  (Native)   │  │  (Native)   │  │ Browser ││
│  └──────┬──────┘  └──────┬──────┘  └────┬────┘│
│         │                 │               │     │
│         └─────────────────┴───────────────┘     │
│                      │                          │
│              ┌───────▼────────┐                 │
│              │   Capacitor    │                 │
│              │  Native Bridge │                 │
│              └───────┬────────┘                 │
│                      │                          │
│         ┌────────────┴────────────┐             │
│         │                         │             │
│    ┌────▼────┐              ┌────▼────┐        │
│    │  React  │              │  Vite   │        │
│    │   UI    │              │  Build  │        │
│    └────┬────┘              └────┬────┘        │
│         │                         │             │
│         └────────────┬────────────┘             │
│                      │                          │
│              ┌───────▼────────┐                 │
│              │  Express API   │                 │
│              │   + WebRTC     │                 │
│              └────────────────┘                 │
└─────────────────────────────────────────────────┘
```

## Features

### ✅ Native Capabilities
- 📷 **Camera Access**: Photo capture, video recording, QR scanning
- 🎤 **Microphone Access**: Voice calls, audio recording
- 📍 **Geolocation**: Real-time location sharing
- 📱 **Device Integration**: Native UI, status bar, keyboard
- 🔔 **Push Notifications**: Real-time alerts and messages
- 📂 **File System Access**: Document storage and sharing
- 🔄 **Background Processing**: Calls continue in background
- 🔗 **Deep Linking**: Open app from URLs
- 📤 **Native Share**: Share content to other apps

### ✅ Platform Features
- 📱 **iOS Support**: iPhone & iPad native app
- 🤖 **Android Support**: Phone & tablet native app
- 🌐 **PWA Support**: Installable web app
- 🎨 **Adaptive UI**: Responsive design for all screen sizes
- 🌙 **Dark Mode**: System-aware dark theme
- 🔒 **Secure**: HTTPS, encrypted storage, biometric auth
- 📶 **Offline Support**: Service worker caching
- 🔄 **Auto-Update**: PWA & native app updates

## Setup Instructions

### Prerequisites

1. **Node.js** (v22+)
2. **npm** or **yarn**
3. **For iOS**: macOS with Xcode 15+
4. **For Android**: Android Studio with SDK 34+

### 1. Install Capacitor Dependencies

```bash
# Install Capacitor CLI and core dependencies
npm install @capacitor/cli @capacitor/core

# Install Capacitor plugins
npm install @capacitor/camera
npm install @capacitor/geolocation
npm install @capacitor/status-bar
npm install @capacitor/keyboard
npm install @capacitor/app
npm install @capacitor/network
npm install @capacitor/device
npm install @capacitor/splash-screen
npm install @capacitor/local-notifications
npm install @capacitor/push-notifications
npm install @capacitor/share
npm install @capacitor/filesystem
npm install @capacitor/haptics

# Install platform-specific dependencies
npm install @capacitor/ios
npm install @capacitor/android
```

### 2. Initialize Capacitor Platforms

```bash
# Initialize Capacitor (if not already done)
npx cap init

# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android
```

### 3. Build the Web App

```bash
# Build production web app
npm run build

# Sync built files to native platforms
npx cap sync
```

### 4. Open in Native IDE

#### iOS (Xcode)
```bash
# Open iOS project in Xcode
npx cap open ios
```

Then in Xcode:
1. Select your development team
2. Choose target device (simulator or real device)
3. Click Run (⌘R)

#### Android (Android Studio)
```bash
# Open Android project in Android Studio
npx cap open android
```

Then in Android Studio:
1. Wait for Gradle sync to complete
2. Select target device (emulator or real device)
3. Click Run (Shift+F10)

## Development Workflow

### 1. Live Reload Development

For development with live reload, you need to point the native apps to your local development server:

**Option A: Update capacitor.config.ts**
```typescript
server: {
  url: 'http://192.168.1.100:3105', // Your local IP
  cleartext: true,
}
```

**Option B: Use environment variables**
```bash
# Start dev server
npm run dev

# Get your local IP
ipconfig getifaddr en0  # macOS
hostname -I  # Linux

# Update capacitor.config.ts with your IP
# Then sync
npx cap sync
```

### 2. Debug on Device

#### iOS Debugging
1. Connect iPhone/iPad via USB
2. In Safari: Develop → [Your Device] → [Your App]
3. Use Safari Web Inspector for debugging

#### Android Debugging
1. Enable USB debugging on Android device
2. Connect via USB
3. In Chrome: `chrome://inspect`
4. Click "inspect" on your app

### 3. Test Native Features

```typescript
import {
  getPlatformInfo,
  takePhoto,
  getCurrentPosition,
  shareContent,
} from '@/lib/mobile-platform';

// Check platform
const platform = await getPlatformInfo();
console.log(`Running on: ${platform.platform}`);

// Take photo
const photo = await takePhoto({ quality: 90 });

// Get location
const position = await getCurrentPosition();

// Share content
await shareContent({
  title: 'CYRUS AI',
  text: 'Check out this AI assistant!',
  url: 'https://cyrus.app',
});
```

## Build for Production

### iOS Production Build

1. **Configure App**:
   - Open `ios/App/App.xcodeproj` in Xcode
   - Set Bundle Identifier
   - Configure Signing & Capabilities
   - Set version and build number

2. **Archive**:
   ```bash
   # Build production web app
   npm run build
   
   # Sync to iOS
   npx cap sync ios
   
   # Open Xcode
   npx cap open ios
   ```
   
   In Xcode:
   - Product → Archive
   - Distribute App → App Store Connect

3. **Submit to App Store**:
   - Use Xcode Organizer
   - Follow App Store submission guidelines

### Android Production Build

1. **Configure App**:
   - Update `android/app/build.gradle`
   - Set `versionCode` and `versionName`
   - Configure signing keys

2. **Generate Signed APK/Bundle**:
   ```bash
   # Build production web app
   npm run build
   
   # Sync to Android
   npx cap sync android
   
   # Open Android Studio
   npx cap open android
   ```
   
   In Android Studio:
   - Build → Generate Signed Bundle / APK
   - Choose Android App Bundle (.aab)
   - Follow signing wizard

3. **Submit to Play Store**:
   - Upload AAB to Google Play Console
   - Complete store listing
   - Submit for review

## Mobile-Specific Configuration

### App Icons

Generate icons for all platforms:

```bash
# Generate PWA icons (already configured)
npm run generate:pwa-icons

# For native apps, use tools like:
# - Icon Generator (https://icon.kitchen/)
# - Android Asset Studio
# - Xcode Asset Catalog
```

Place icons in:
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/`

### Splash Screen

Configure splash screens in:
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`
- Android: `android/app/src/main/res/drawable-*/splash.png`

### Permissions

All required permissions are pre-configured in:
- iOS: `ios/App/App/Info.plist`
- Android: `android/app/src/main/AndroidManifest.xml`

Permissions included:
- ✅ Camera
- ✅ Microphone
- ✅ Location (when in use & background)
- ✅ Photo library
- ✅ File access
- ✅ Network access
- ✅ Push notifications
- ✅ Background modes (audio, VoIP)

### Deep Linking

#### Configure Universal Links (iOS)

1. Add to `ios/App/App/App.entitlements`:
```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:cyrus.app</string>
</array>
```

2. Create `.well-known/apple-app-site-association` on your server:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.cyrus.ai.mobile",
        "paths": ["*"]
      }
    ]
  }
}
```

#### Configure App Links (Android)

Already configured in `AndroidManifest.xml` with:
```xml
<intent-filter android:autoVerify="true">
    <data android:scheme="https" android:host="cyrus.app" />
</intent-filter>
```

Create `.well-known/assetlinks.json` on your server.

### Push Notifications

#### iOS Setup
1. Enable Push Notifications in Xcode capabilities
2. Generate APNs certificate/key from Apple Developer
3. Configure server to send notifications via APNs

#### Android Setup
1. Create Firebase project
2. Download `google-services.json`
3. Place in `android/app/`
4. Configure server to send via FCM

## Mobile UI Optimizations

### Responsive Design

The app automatically adapts to mobile screens:
- Touch-friendly controls (min 44x44 pt)
- Mobile-optimized navigation
- Collapsible sections
- Swipe gestures
- Pull-to-refresh

### Performance

Optimizations included:
- Code splitting
- Lazy loading routes
- Image optimization
- Service worker caching
- WebRTC optimization for mobile networks

### Network Handling

The app handles network changes gracefully:
- Detects online/offline status
- Queues actions when offline
- Syncs when back online
- Adapts call quality to network type

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Mobile-Specific Testing

#### iOS Testing
```bash
# Run on simulator
npx cap run ios

# Run on device
npx cap run ios --target="Your iPhone"
```

#### Android Testing
```bash
# Run on emulator
npx cap run android

# Run on device
npx cap run android --target="device-id"
```

### Test Checklist

Mobile feature testing:
- [ ] Camera capture works
- [ ] Photo gallery access works
- [ ] Location sharing works
- [ ] Push notifications received
- [ ] Background calls continue
- [ ] Deep links open correctly
- [ ] Share functionality works
- [ ] Offline mode works
- [ ] App resume from background
- [ ] Screen rotation handled
- [ ] Network change handled
- [ ] Battery optimization compatible

## Deployment

### Continuous Deployment

#### GitHub Actions Example

```yaml
name: Mobile Build

on:
  push:
    tags:
      - 'v*'

jobs:
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx cap sync ios
      # Add signing and upload steps

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx cap sync android
      # Add signing and upload steps
```

### Version Management

Update versions in:
1. `package.json` - `version`
2. `ios/App/App.xcodeproj` - CFBundleShortVersionString
3. `android/app/build.gradle` - versionName & versionCode

## Troubleshooting

### Common Issues

#### iOS Build Fails
- **Solution**: Check Xcode version, update CocoaPods
  ```bash
  cd ios/App
  pod repo update
  pod install
  ```

#### Android Build Fails
- **Solution**: Clean and rebuild
  ```bash
  cd android
  ./gradlew clean
  ./gradlew build
  ```

#### Plugins Not Working
- **Solution**: Sync Capacitor
  ```bash
  npx cap sync
  ```

#### Live Reload Not Working
- **Solution**: Check IP address is correct and reachable
- Disable firewall temporarily
- Use USB debugging

#### White Screen on Launch
- **Solution**: Check build output directory
  ```bash
  npm run build
  npx cap copy
  ```

### Debug Logs

#### iOS Logs
```bash
# Device console
idevicesyslog

# Xcode console
Window → Devices and Simulators
```

#### Android Logs
```bash
# ADB logcat
adb logcat

# Filter CYRUS logs
adb logcat | grep CYRUS
```

## Best Practices

### 1. Always Test on Real Devices
Simulators/emulators don't fully replicate:
- Camera behavior
- Network conditions
- Push notifications
- Performance characteristics

### 2. Handle Permissions Gracefully
- Request permissions when needed
- Explain why permission is needed
- Provide fallbacks if denied

### 3. Optimize for Battery
- Use wake locks sparingly
- Stop background tasks when not needed
- Minimize location updates frequency

### 4. Handle App Lifecycle
- Save state on pause
- Restore state on resume
- Clean up resources properly

### 5. Test Network Conditions
- Test on 3G/4G/5G
- Test network handoffs
- Test offline mode
- Test poor connections

## Support

### Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Design Guidelines](https://developer.android.com/design)

### Getting Help
1. Check documentation
2. Review GitHub issues
3. Ask in discussions
4. Contact support

## Updating

### Update Capacitor
```bash
# Update all Capacitor packages
npm install @capacitor/cli@latest @capacitor/core@latest
npm install @capacitor/ios@latest @capacitor/android@latest

# Update all plugins
npm update

# Sync platforms
npx cap sync
```

### Update iOS
```bash
cd ios/App
pod repo update
pod update
```

### Update Android
```bash
cd android
./gradlew clean
./gradlew --refresh-dependencies
```

## Monitoring

### Analytics
Integrate mobile analytics:
- Firebase Analytics
- Amplitude
- Mixpanel

### Crash Reporting
Integrate crash reporting:
- Sentry
- Crashlytics
- Bugsnag

### Performance Monitoring
Track performance:
- App load time
- API response time
- Network requests
- Memory usage

---

**Status**: ✅ **MOBILE CONFIGURATION COMPLETE**  
**Platforms**: iOS, Android, Web/PWA  
**Date**: June 13, 2026

**Next Steps**: Build and test on target devices!
