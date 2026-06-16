/**
 * WebRTC media requires a secure context (HTTPS or localhost).
 * Raw HTTP to an IP address blocks navigator.mediaDevices in Chrome/Firefox/Safari.
 */
export function isSecureMediaContext(): boolean {
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function getMediaDevices(): MediaDevices {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    const host =
      typeof window !== "undefined" ? window.location.hostname : "this site";
    const viaHttpIp = !isSecureMediaContext();
    const hint = viaHttpIp
      ? `Calls require HTTPS. Open https://${host.replace(/\./g, "-")}.sslip.io (after HTTPS is enabled) or use an SSH tunnel: ssh -L 3020:127.0.0.1:3020 cyrus@167.233.36.99 then http://127.0.0.1:3020`
      : "Use Chrome, Firefox, or Safari over HTTPS.";
    throw Object.assign(new Error(`Camera/microphone unavailable: ${hint}`), {
      name: "SecurityError",
    });
  }
  return navigator.mediaDevices;
}
