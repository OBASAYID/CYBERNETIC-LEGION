import React, { useState } from "react";

export function LoginBar({ connected, onJoin }) {
  const [userId, setUserId] = useState(() => localStorage.getItem("cyrus-comm-user") || "");
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("cyrus-comm-name") || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const uid = userId.trim();
    if (!uid) return;
    localStorage.setItem("cyrus-comm-user", uid);
    localStorage.setItem("cyrus-comm-name", displayName.trim() || uid);
    onJoin(uid, displayName.trim() || uid);
  };

  return (
    <div className="panel">
      <h2>Session</h2>
      <form onSubmit={handleSubmit} className="row">
        <label>
          User ID{" "}
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="alice"
            disabled={connected}
            style={{ marginLeft: 6 }}
          />
        </label>
        <label>
          Display name{" "}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alice"
            disabled={connected}
            style={{ marginLeft: 6 }}
          />
        </label>
        {!connected ? (
          <button type="submit" className="btn btn-primary">
            Join
          </button>
        ) : (
          <span className="ok" style={{ color: "#4ade80" }}>
            Joined as {userId}
          </span>
        )}
      </form>
    </div>
  );
}
