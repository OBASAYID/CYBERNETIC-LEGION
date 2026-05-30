import React, { useEffect, useRef, useState } from "react";

/**
 * watchPosition → Socket.IO location-update (throttled).
 */
export function LocationTracker({ socket, userId, enabled }) {
  const [lines, setLines] = useState([]);
  const [sharing, setSharing] = useState(false);
  const watchId = useRef(null);
  const lastEmit = useRef(0);

  const pushLine = (s) => {
    setLines((prev) => [...prev.slice(-40), `${new Date().toISOString()} ${s}`]);
  };

  useEffect(() => {
    if (!socket || !userId || !enabled) return;

    const onOthers = (payload) => {
      pushLine(
        `peer ${payload.userId} (${payload.displayName}): ${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}`,
      );
    };
    socket.on("location-updated", onOthers);
    return () => socket.off("location-updated", onOthers);
  }, [socket, userId, enabled]);

  const stop = () => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
    pushLine("location sharing stopped");
  };

  const start = () => {
    if (!socket?.connected || !userId) {
      pushLine("cannot start: socket or userId missing");
      return;
    }
    if (!navigator.geolocation) {
      pushLine("geolocation not available");
      return;
    }
    stop();
    setSharing(true);
    pushLine("watchPosition started");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastEmit.current < 2000) return;
        lastEmit.current = now;
        const { latitude, longitude, accuracy } = pos.coords;
        socket.emit("location-update", { latitude, longitude, accuracy });
        pushLine(`emit ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      (err) => pushLine(`geo error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  };

  useEffect(() => () => stop(), []);

  if (!enabled) return null;

  return (
    <div className="panel">
      <h2>Live location (debug)</h2>
      <p style={{ margin: "0 0 0.5rem", fontSize: 13, color: "#94a3b8" }}>
        Broadcasts your coordinates to other joined users. Allow browser location when prompted.
      </p>
      <div className="row">
        {!sharing ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            Start sharing
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={stop}>
            Stop sharing
          </button>
        )}
      </div>
      <pre className="loc-debug">{lines.join("\n")}</pre>
    </div>
  );
}
