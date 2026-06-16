/**
 * Mobile Platform Utilities for CYRUS AI
 * 
 * Handles platform detection, native features, and mobile-specific optimizations
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';

export interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobile: boolean;
  platform: string;
  deviceInfo?: any;
}

export interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

/**
 * Get current platform information
 */
export async function getPlatformInfo(): Promise<PlatformInfo> {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  const isWeb = platform === 'web';
  
  let deviceInfo;
  try {
    deviceInfo = await Device.getInfo();
  } catch {
    deviceInfo = null;
  }

  return {
    isNative,
    isIOS,
    isAndroid,
    isWeb,
    isMobile: isNative || isMobileWeb(),
    platform,
    deviceInfo,
  };
}

/**
 * Detect if running on mobile web
 */
export function isMobileWeb(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
}

/**
 * Initialize mobile platform features
 */
export async function initializeMobilePlatform(): Promise<void> {
  const platform = await getPlatformInfo();
  
  if (!platform.isNative) {
    console.log('[Mobile] Running on web platform');
    return;
  }

  console.log(`[Mobile] Initializing ${platform.platform} platform`);

  // Set up status bar
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f172a' });
  } catch (error) {
    console.warn('[Mobile] Status bar configuration failed:', error);
  }

  // Set up keyboard behavior
  try {
    Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch (error) {
    console.warn('[Mobile] Keyboard configuration failed:', error);
  }

  // Listen for app state changes
  App.addListener('appStateChange', ({ isActive }) => {
    console.log(`[Mobile] App state changed: ${isActive ? 'active' : 'inactive'}`);
    window.dispatchEvent(new CustomEvent('cyrus-app-state-change', { detail: { isActive } }));
  });

  // Listen for URL opens (deep links)
  App.addListener('appUrlOpen', (data) => {
    console.log('[Mobile] App opened with URL:', data.url);
    window.dispatchEvent(new CustomEvent('cyrus-deep-link', { detail: { url: data.url } }));
  });

  // Listen for network status changes
  Network.addListener('networkStatusChange', (status) => {
    console.log('[Mobile] Network status changed:', status);
    window.dispatchEvent(new CustomEvent('cyrus-network-change', { detail: status }));
  });

  console.log('[Mobile] Platform initialized successfully');
}

/**
 * Take a photo using the native camera
 */
export async function takePhoto(options?: {
  quality?: number;
  allowEditing?: boolean;
  saveToGallery?: boolean;
}): Promise<string | null> {
  try {
    const image = await Camera.getPhoto({
      quality: options?.quality ?? 90,
      allowEditing: options?.allowEditing ?? false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: options?.saveToGallery ?? false,
      correctOrientation: true,
    });

    return image.dataUrl ?? null;
  } catch (error) {
    console.error('[Mobile] Camera error:', error);
    return null;
  }
}

/**
 * Pick a photo from gallery
 */
export async function pickPhoto(options?: {
  quality?: number;
  allowEditing?: boolean;
}): Promise<string | null> {
  try {
    const image = await Camera.getPhoto({
      quality: options?.quality ?? 90,
      allowEditing: options?.allowEditing ?? false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
    });

    return image.dataUrl ?? null;
  } catch (error) {
    console.error('[Mobile] Photo picker error:', error);
    return null;
  }
}

/**
 * Get current geolocation
 */
export async function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (error) {
    console.error('[Mobile] Geolocation error:', error);
    return null;
  }
}

/**
 * Watch position with continuous updates
 */
export async function watchPosition(
  callback: (position: { latitude: number; longitude: number; accuracy: number }) => void,
): Promise<string> {
  const id = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
    (position, error) => {
      if (error) {
        console.error('[Mobile] Position watch error:', error);
        return;
      }

      if (position) {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      }
    },
  );

  return id;
}

/**
 * Clear position watch
 */
export async function clearWatch(id: string): Promise<void> {
  await Geolocation.clearWatch({ id });
}

/**
 * Get network status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (error) {
    console.error('[Mobile] Network status error:', error);
    return {
      connected: navigator.onLine,
      connectionType: 'unknown',
    };
  }
}

/**
 * Check if running in background
 */
export async function isAppInBackground(): Promise<boolean> {
  try {
    const state = await App.getState();
    return !state.isActive;
  } catch {
    return document.hidden;
  }
}

/**
 * Minimize app
 */
export async function minimizeApp(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await App.minimizeApp();
    } catch (error) {
      console.warn('[Mobile] Cannot minimize app:', error);
    }
  }
}

/**
 * Exit app (Android only)
 */
export async function exitApp(): Promise<void> {
  const platform = await getPlatformInfo();
  
  if (platform.isAndroid) {
    try {
      await App.exitApp();
    } catch (error) {
      console.warn('[Mobile] Cannot exit app:', error);
    }
  }
}

/**
 * Request permissions
 */
export async function requestPermissions(): Promise<{
  camera: boolean;
  geolocation: boolean;
}> {
  const results = {
    camera: false,
    geolocation: false,
  };

  // Camera permission
  try {
    const cameraResult = await Camera.checkPermissions();
    if (cameraResult.camera === 'granted' || cameraResult.photos === 'granted') {
      results.camera = true;
    } else {
      const requested = await Camera.requestPermissions();
      results.camera = requested.camera === 'granted' || requested.photos === 'granted';
    }
  } catch (error) {
    console.warn('[Mobile] Camera permission error:', error);
  }

  // Geolocation permission
  try {
    const geoResult = await Geolocation.checkPermissions();
    if (geoResult.location === 'granted') {
      results.geolocation = true;
    } else {
      const requested = await Geolocation.requestPermissions();
      results.geolocation = requested.location === 'granted';
    }
  } catch (error) {
    console.warn('[Mobile] Geolocation permission error:', error);
  }

  return results;
}

/**
 * Get device battery status (if available)
 */
export async function getBatteryStatus(): Promise<{
  level: number;
  isCharging: boolean;
} | null> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return {
        level: battery.level * 100,
        isCharging: battery.charging,
      };
    }
  } catch {
    // Battery API not available
  }
  return null;
}

/**
 * Vibrate device (if supported)
 */
export function vibrate(duration: number = 200): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

/**
 * Share content using native share
 */
export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if ('share' in navigator) {
    try {
      await (navigator as any).share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch (error) {
      console.warn('[Mobile] Share error:', error);
      return false;
    }
  }
  return false;
}

/**
 * Open app settings
 */
export async function openSettings(): Promise<void> {
  const platform = await getPlatformInfo();
  
  if (platform.isIOS) {
    window.open('app-settings:', '_system');
  } else if (platform.isAndroid) {
    // Android settings opening requires a native plugin
    console.warn('[Mobile] Opening settings on Android requires native implementation');
  }
}

/**
 * Keep screen awake during calls
 */
export async function keepAwake(): Promise<void> {
  try {
    if ('wakeLock' in navigator) {
      await (navigator as any).wakeLock.request('screen');
    }
  } catch (error) {
    console.warn('[Mobile] Wake lock error:', error);
  }
}

/**
 * Release wake lock
 */
export async function releaseWakeLock(): Promise<void> {
  // Wake lock is automatically released when the page is hidden
  // This is a placeholder for explicit release if needed
}

/**
 * Check if app has specific permission
 */
export async function checkPermission(permission: 'camera' | 'geolocation'): Promise<boolean> {
  try {
    if (permission === 'camera') {
      const result = await Camera.checkPermissions();
      return result.camera === 'granted' || result.photos === 'granted';
    } else if (permission === 'geolocation') {
      const result = await Geolocation.checkPermissions();
      return result.location === 'granted';
    }
  } catch (error) {
    console.warn(`[Mobile] Check permission error (${permission}):`, error);
  }
  return false;
}

/**
 * Log platform diagnostics
 */
export async function logPlatformDiagnostics(): Promise<void> {
  const platform = await getPlatformInfo();
  const network = await getNetworkStatus();
  const battery = await getBatteryStatus();

  console.group('[Mobile] Platform Diagnostics');
  console.log('Platform:', platform);
  console.log('Network:', network);
  console.log('Battery:', battery);
  console.groupEnd();
}
