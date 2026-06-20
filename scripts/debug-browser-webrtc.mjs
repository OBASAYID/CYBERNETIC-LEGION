#!/usr/bin/env node
/**
 * Headless two-browser video call against local dev — captures client debug logs via /api/debug/session-log.
 */
import { chromium } from "@playwright/test";

const ORIGIN = process.env.CYRUS_DEBUG_ORIGIN || "http://127.0.0.1:3105";
const CODE = process.env.USER_ACCESS_CODE || process.env.CYRUS_E2E_ACCESS_CODE || "874344";

async function loginContext(browser, username, displayName) {
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
    baseURL: ORIGIN,
  });
  const res = await context.request.post(`${ORIGIN}/api/login`, {
    data: { username, code: CODE },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => "");
    throw new Error(`login failed ${username} ${res.status()} ${body.slice(0, 200)}`);
  }
  const { sessionToken } = await res.json();
  const deviceId = `dbg_${username.replace(/[^a-z0-9_]/gi, "_")}`;
  await context.addInitScript(
    (t) => {
      localStorage.setItem("cyrus_auth_session", "valid");
      localStorage.setItem("cyrus_auth_timestamp", String(Date.now()));
      localStorage.setItem("cyrus-user-role", "user");
      localStorage.setItem("cyrus-display-name", t.dn);
      if (t.token) localStorage.setItem("cyrus_session_token", t.token);
      localStorage.setItem("cyrus_device_id", t.deviceId);
      localStorage.setItem("cyrus-device-id", t.deviceId);
    },
    { token: sessionToken || "", dn: displayName, deviceId },
  );
  const page = await context.newPage();
  page.on("console", (msg) => {
    const t = msg.text();
    if (/Presence|WebRTC|INCOMING|call-user|call-ringing/i.test(t)) {
      console.log(`[${username}] ${t}`);
    }
  });
  await page.goto(`${ORIGIN}/comms?tab=video`, { waitUntil: "domcontentloaded" });
  await page.getByText(/● live/).waitFor({ timeout: 90_000 });
  return { context, page };
}

async function waitDialerCard(page, name) {
  const card = page.getByRole("button", { name: new RegExp(name, "i") });
  for (let i = 0; i < 120; i++) {
    if ((await card.count()) > 0) return card.first();
    await page.waitForTimeout(500);
  }
  throw new Error(`Dialer card for ${name} not found`);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  try {
    const caller = await loginContext(browser, "dbg_webrtc_a", "Dbg Caller");
    const callee = await loginContext(browser, "dbg_webrtc_b", "Dbg Callee");

    const calleeCard = await waitDialerCard(caller.page, "Dbg Callee");

    const acceptPromise = callee.page
      .getByText(/INCOMING.*CALL/i)
      .waitFor({ timeout: 90_000 })
      .then(() => callee.page.getByRole("button", { name: /^ACCEPT$/i }).click({ force: true }));

    await calleeCard.click();
    await acceptPromise;

    await caller.page.waitForTimeout(18_000);
    await callee.page.waitForTimeout(18_000);

    console.log("[debug-browser-webrtc] call window complete");
    await caller.context.close();
    await callee.context.close();
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
