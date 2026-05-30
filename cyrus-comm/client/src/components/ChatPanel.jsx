import React, { useState, useRef, useEffect } from "react";

export function ChatPanel({ peerId, peerLabel, messages, onSend, disabled }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!peerId) {
    return (
      <div className="panel">
        <h2>Chat</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Select a user to exchange messages.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Chat with {peerLabel || peerId}</h2>
      <div className="chat-log">
        {messages.map((m) => (
          <div key={m.id} className="msg">
            <span className="meta">
              {new Date(m.ts).toLocaleTimeString()} · {m.fromUserId === peerId ? peerLabel || peerId : "You"}
            </span>
            <div>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          onSend(t);
          setText("");
        }}
      >
        <input
          style={{ flex: 1, minWidth: 120 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          disabled={disabled}
        />
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}
