/** True when the URL is the lightweight P2P call shell (no Command Center chrome). */
export function isCommsCallRoute(location: string): boolean {
  const path = location.split("?")[0]?.split("#")[0] ?? location;
  return path === "/comms/call";
}

/** Comms hub paths — isolated from Command Center lazy modules. */
export function isCommsHubRoute(location: string): boolean {
  const path = location.split("?")[0]?.split("#")[0] ?? location;
  return path === "/comms" || path.startsWith("/comms/");
}
