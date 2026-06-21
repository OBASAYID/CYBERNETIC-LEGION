let systemReady = false;

export function getSystemReady(): boolean {
  return systemReady;
}

export function setSystemReady(ready: boolean): void {
  systemReady = ready;
}
