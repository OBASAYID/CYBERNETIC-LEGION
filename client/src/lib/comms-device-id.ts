/**
 * Stable Comms / Pshare / Socket identity. Keeps `cyrus_device_id` and legacy `cyrus-device-id` in sync.
 */
export function getCommsDeviceId(): string {
  if (typeof localStorage === "undefined") {
    return `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
  const presence = localStorage.getItem("cyrus_device_id");
  const legacyKey = "cyrus-device-id";
  const legacy = localStorage.getItem(legacyKey);
  if (presence) {
    if (legacy !== presence) {
      localStorage.setItem(legacyKey, presence);
    }
    return presence;
  }
  let deviceId = legacy;
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
  localStorage.setItem(legacyKey, deviceId);
  localStorage.setItem("cyrus_device_id", deviceId);
  return deviceId;
}
