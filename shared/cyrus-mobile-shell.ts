/**
 * Mobile shell model: lightweight PWA on device, heavy compute on production server.
 * Same-origin install from PUBLIC_BASE_URL is the default path (no split-origin required).
 */

export type CyrusMobileShellPayload = {
  /** PWA installable from the public origin. */
  pwaEnabled: boolean;
  /** URL users open on mobile to install (Add to Home Screen). */
  installUrl: string;
  architecture: "local-shell-remote-compute";
  /** Same origin as installUrl when using standard production PWA. */
  apiOrigin: string;
  dataTransfer: {
    initialInstallEstimateMb: string;
    typicalRequestKb: string;
    cachedOnDevice: string[];
    processedOnServer: string[];
  };
  installSteps: {
    ios: string[];
    android: string[];
  };
};

export function buildMobileShellPayload(publicBaseUrl: string): CyrusMobileShellPayload {
  const origin = publicBaseUrl.replace(/\/+$/, "");
  return {
    pwaEnabled: true,
    installUrl: origin,
    architecture: "local-shell-remote-compute",
    apiOrigin: origin,
    dataTransfer: {
      initialInstallEstimateMb: "~3",
      typicalRequestKb: "1–10",
      cachedOnDevice: ["ui-shell", "js-css-chunks", "icons", "fonts"],
      processedOnServer: [
        "ai-inference",
        "llm",
        "database",
        "file-storage",
        "webrtc-signaling",
        "voice-stt-tts",
      ],
    },
    installSteps: {
      ios: [
        `Open ${origin} in Safari`,
        "Tap Share → Add to Home Screen",
        "Launch CYRUS from the home screen icon",
      ],
      android: [
        `Open ${origin} in Chrome`,
        "Tap Install when prompted (or menu → Install app)",
        "Launch CYRUS from the home screen icon",
      ],
    },
  };
}
