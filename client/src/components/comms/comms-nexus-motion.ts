/** Shared motion tokens for NEXUS comms surfaces (inject once per mounted scene). */
export const COMMS_NEXUS_KEYFRAMES = `
@keyframes commsSeatPop {
  from { opacity: 0; transform: scale(0.55) translateY(18px); filter: blur(4px); }
  to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
@keyframes commsHubPulse {
  0%, 100% { box-shadow: 0 0 24px rgba(0,229,255,0.35), 0 0 0 0 rgba(0,229,255,0.25); }
  50% { box-shadow: 0 0 36px rgba(0,229,255,0.55), 0 0 0 6px rgba(0,229,255,0.08); }
}
@keyframes commsHoloBar {
  0%, 100% { transform: scaleY(0.85); opacity: 0.65; }
  50% { transform: scaleY(1.08); opacity: 1; }
}
@keyframes commsHubEnter {
  from { opacity: 0; transform: translate(-50%, -108%) scale(0.92); filter: blur(3px); }
  to { opacity: 1; transform: translate(-50%, -108%) scale(1); filter: blur(0); }
}
`;

export const COMMS_CYAN = "#00e5ff";
