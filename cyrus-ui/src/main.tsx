import "./lib/fetch-fusion-bootstrap";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getCyrusApiBase } from "./lib/api-url";

console.log("[CYRUS] Booting application...");
console.log("[CYRUS] Environment:", {
  apiBase: getCyrusApiBase() || "(same-origin)",
  origin: window.location.origin,
  pathname: window.location.pathname,
  userAgent: navigator.userAgent,
});

let bootFailureShown = false;
/** After first paint, errors/rejections are logged only — never replace the whole shell (WebRTC can reject ICE/SDP). */
let cyrusAppCommitted = false;

function showBootFailure(message: string, detail?: string) {
  if (bootFailureShown) return;
  bootFailureShown = true;
  console.error("[CYRUS] Boot failure:", message, detail ?? "");
  const root = document.getElementById("root");
  if (!root) return;
  const detailHtml = detail
    ? `<pre style="margin:10px 0 0;font-size:11px;opacity:.55;text-align:left;overflow:auto;max-height:160px;white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,.4);border-radius:6px;padding:8px;">${detail}</pre>`
    : "";
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <div style="max-width:640px;width:100%;text-align:center;border:1px solid rgba(34,211,238,.35);border-radius:14px;padding:28px 24px;background:rgba(15,23,42,.55);">
        <h1 style="margin:0 0 12px;font-size:16px;letter-spacing:.08em;color:#f87171;">UI BOOT FAILURE</h1>
        <p style="margin:0 0 6px;font-size:13px;opacity:.9;word-break:break-word;">${message}</p>
        ${detailHtml}
        <p style="margin:14px 0 18px;font-size:12px;opacity:.6;">Open the browser console (F12) for full details. Try reloading or clearing site data.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button onclick="location.reload()" style="padding:8px 16px;border-radius:10px;border:1px solid #22d3ee;background:#0f172a;color:#d1d5db;cursor:pointer;font-size:13px;">Reload</button>
          <button onclick="(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){}location.reload();})()" style="padding:8px 16px;border-radius:10px;border:1px solid rgba(248,113,113,.5);background:#0f172a;color:#fca5a5;cursor:pointer;font-size:13px;">Clear Cache &amp; Reload</button>
        </div>
      </div>
    </div>
  `;
}

// Catch synchronous JS errors during initial boot only (never nuke the app mid-session).
window.addEventListener("error", (event) => {
  console.error("[CYRUS] Global error:", event.error ?? event.message, event);
  if (!cyrusAppCommitted) {
    showBootFailure(
      `Error: ${event.error?.message ?? event.message ?? "Unknown error"}`,
      event.error?.stack,
    );
  }
});

// Unhandled rejections during calls (e.g. ICE "Expect line: candidate:") must not replace #root.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  console.error("[CYRUS] Unhandled rejection:", reason);
  if (!cyrusAppCommitted) {
    showBootFailure(
      `Promise rejection: ${reason instanceof Error ? reason.message : String(reason ?? "Unknown")}`,
      reason instanceof Error ? reason.stack : undefined,
    );
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root mount element — check index.html for <div id=\"root\">");
}

// If React hasn't rendered anything after 8 s, surface a visible error
const bootTimeout = window.setTimeout(() => {
  if (!rootEl.hasChildNodes()) {
    showBootFailure(
      "Application shell did not mount within 8 seconds.",
      "Possible causes: network error loading JS chunks, React render exception swallowed silently, or a missing environment variable. Check the browser Network tab and Console for details.",
    );
  }
}, 8000);

try {
  console.log("[CYRUS] Calling createRoot().render()...");
  createRoot(rootEl).render(<App />);
  window.clearTimeout(bootTimeout);
  // Defer: first tick + frame so startup async work still counts as "boot", then runtime errors only log.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        cyrusAppCommitted = true;
      }, 400);
    });
  });
  console.log("[CYRUS] React render initiated successfully.");
} catch (error) {
  window.clearTimeout(bootTimeout);
  console.error("[CYRUS] createRoot render threw:", error);
  const msg = error instanceof Error ? error.message : "Unknown startup error";
  const stack = error instanceof Error ? error.stack : undefined;
  showBootFailure(msg, stack);
}
