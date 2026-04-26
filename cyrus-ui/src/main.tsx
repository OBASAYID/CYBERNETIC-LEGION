import "./lib/fetch-fusion-bootstrap";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function showBootFailure(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <div style="max-width:620px;text-align:center;border:1px solid rgba(34,211,238,.35);border-radius:14px;padding:24px;background:rgba(15,23,42,.45);">
        <h1 style="margin:0 0 12px;font-size:16px;letter-spacing:.08em;color:#f87171;">UI BOOT FAILURE</h1>
        <p style="margin:0 0 10px;font-size:13px;opacity:.9;word-break:break-word;">${message}</p>
        <p style="margin:0 0 16px;font-size:12px;opacity:.7;">Try reloading. If this continues, clear browser site data and redeploy latest assets.</p>
        <button onclick="location.reload()" style="padding:8px 14px;border-radius:10px;border:1px solid #22d3ee;background:#0f172a;color:#d1d5db;cursor:pointer;">Reload</button>
      </div>
    </div>
  `;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root mount element");
}

const bootTimeout = window.setTimeout(() => {
  if (!rootEl.hasChildNodes()) {
    showBootFailure("Application shell did not mount in time.");
  }
}, 8000);

try {
  createRoot(rootEl).render(<App />);
  window.clearTimeout(bootTimeout);
} catch (error) {
  window.clearTimeout(bootTimeout);
  const msg = error instanceof Error ? error.message : "Unknown startup error";
  showBootFailure(msg);
}
