import React, { useEffect, useState } from "react";

/**
 * Multi-user session coordination (Socket.IO room `sess:<id>`).
 * Foundation for mission rooms, SFU routing keys, and satellite / UAV task grouping.
 */
export function SessionPanel({ socket, joined }) {
  const [sessionId, setSessionId] = useState("mission-alpha");
  const [members, setMembers] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!socket || !joined) return;
    const onMembers = (payload) => {
      setMembers(payload.members || []);
      setActiveSession(payload.sessionId);
    };
    socket.on("session-members", onMembers);
    return () => socket.off("session-members", onMembers);
  }, [socket, joined]);

  const joinSession = () => {
    if (!socket?.connected) return;
    const id = sessionId.trim() || "default";
    socket.emit("join-session", { sessionId: id }, (ack) => {
      if (!ack?.ok) console.warn("[session] join-session failed", ack);
    });
  };

  const leaveSession = () => {
    if (!socket?.connected || !activeSession) return;
    socket.emit("leave-session", { sessionId: activeSession }, (ack) => {
      if (ack?.ok) {
        setMembers([]);
        setActiveSession(null);
      }
    });
  };

  if (!joined) return null;

  return (
    <div className="panel">
      <h2>Multi-user session</h2>
      <p style={{ margin: "0 0 0.5rem", fontSize: 13, color: "#94a3b8" }}>
        Join a named session to receive <code>session-members</code> updates (all participants in the same room). Use the
        same ID on each client for a shared mission context.
      </p>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <input
          className="input"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="session id"
          style={{ minWidth: 180 }}
        />
        <button type="button" className="btn btn-primary" onClick={joinSession}>
          Join session
        </button>
        <button type="button" className="btn btn-ghost" onClick={leaveSession} disabled={!activeSession}>
          Leave session
        </button>
      </div>
      {activeSession ? (
        <p style={{ margin: "0.75rem 0 0.25rem", fontSize: 13, color: "#7dd3fc" }}>
          Active: <strong>{activeSession}</strong> — {members.length} member(s)
        </p>
      ) : null}
      <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: 13, color: "#cbd5e1" }}>
        {members.map((m) => (
          <li key={m.userId}>
            {m.displayName} <span style={{ color: "#64748b" }}>({m.userId})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
