import React from "react";

export function CallControls({ visible, onHangup }) {
  if (!visible) return null;
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <button type="button" className="btn btn-danger" onClick={onHangup}>
        End call
      </button>
    </div>
  );
}
