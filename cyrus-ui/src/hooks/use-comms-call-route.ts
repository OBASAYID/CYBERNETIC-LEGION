import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { usePresence } from "../../../client/src/contexts/PresenceContext";
import { isCommsCallRoute } from "@/lib/comms-route-utils";

const COMMS_CALL_PATH = "/comms/call";
const COMMS_HUB_PATH = "/comms";

/**
 * During P2P calls, mount only the lightweight call shell — unmount Comms Hub tabs,
 * dashboard, and Command Center modules to reduce RAM and main-thread work.
 */
export function useCommsCallRoute(): void {
  const [location, setLocation] = useLocation();
  const { incomingCall, activeCall } = usePresence();
  const p2pCallActive = Boolean(incomingCall || activeCall);
  const onCallRoute = isCommsCallRoute(location);
  const prevP2pRef = useRef(false);

  useEffect(() => {
    if (p2pCallActive && !onCallRoute) {
      setLocation(COMMS_CALL_PATH);
      return;
    }
    if (!p2pCallActive && onCallRoute && prevP2pRef.current) {
      setLocation(COMMS_HUB_PATH);
    }
    prevP2pRef.current = p2pCallActive;
  }, [p2pCallActive, onCallRoute, setLocation]);
}

export function CommsCallRouteWatcher() {
  useCommsCallRoute();
  return null;
}
