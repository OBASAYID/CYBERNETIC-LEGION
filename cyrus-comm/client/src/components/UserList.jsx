import React from "react";

export function UserList({ users, selfId, selectedId, onSelect, onCallAudio, onCallVideo, inCall }) {
  const others = users.filter((u) => u.userId !== selfId);

  return (
    <div className="panel">
      <h2>Online users</h2>
      {others.length === 0 ? (
        <p style={{ color: "#64748b", margin: 0 }}>No other users. Open a second browser tab or window.</p>
      ) : (
        <ul className="user-list">
          {others.map((u) => (
            <li key={u.userId}>
              <button
                type="button"
                className="btn-ghost btn"
                onClick={() => onSelect(u.userId)}
                style={{
                  borderColor: selectedId === u.userId ? "#38bdf8" : undefined,
                  flex: 1,
                  textAlign: "left",
                }}
              >
                <strong>{u.displayName}</strong>
                <span style={{ color: "#64748b", marginLeft: 8 }}>({u.userId})</span>
              </button>
              <div className="row" style={{ marginLeft: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={inCall}
                  onClick={() => onCallAudio(u.userId)}
                  title="Voice call"
                >
                  Voice
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={inCall}
                  onClick={() => onCallVideo(u.userId)}
                  title="Video call"
                >
                  Video
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
