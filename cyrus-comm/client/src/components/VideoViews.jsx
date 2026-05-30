import React, { useEffect, useRef } from "react";

export function VideoViews({ localStream, remoteStream, remoteName }) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);

  useEffect(() => {
    if (localRef.current) {
      localRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current) {
      remoteRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  return (
    <div className="panel">
      <h2>Media</h2>
      <div className="video-grid">
        <div className="video-wrap">
          <video ref={localRef} autoPlay playsInline muted />
          <span className="video-label">Local (muted preview)</span>
        </div>
        <div className="video-wrap">
          <video ref={remoteRef} autoPlay playsInline />
          <span className="video-label">{remoteName || "Remote"}</span>
        </div>
      </div>
    </div>
  );
}
