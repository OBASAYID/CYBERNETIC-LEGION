/**
 * Two-browser Comms tests: presence (/cyrus-io) voice + video via Calls → Quick call.
 * Requires Chromium fake media flags (see playwright.config.ts).
 *
 * Auth: seed session via `context.addInitScript` before the first document load so
 * `useAuthSession` sees `cyrus_session_token` on cold load (token-first login).
 */
import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

test.setTimeout(240_000);

function accessCode(): string {
  const fromEnv = process.env.CYRUS_E2E_ACCESS_CODE || process.env.USER_ACCESS_CODE;
  if (fromEnv?.trim()) return fromEnv.trim();
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set CYRUS_E2E_ACCESS_CODE or USER_ACCESS_CODE for Comms call E2E.");
  }
  return "170392";
}

async function gotoWithDevRetry(page: Page, url: string, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt === maxAttempts - 1 || !msg.includes("ERR_ABORTED")) throw e;
      await page.waitForTimeout(400);
    }
  }
}

async function newLoggedInCommsContext(
  browser: Browser,
  baseURL: string | undefined,
  opts: { username: string; displayName: string },
): Promise<{ context: BrowserContext; page: Page }> {
  const origin = (baseURL || "http://127.0.0.1:3105").replace(/\/$/, "");
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
    ignoreHTTPSErrors: true,
    baseURL: origin,
  });

  const res = await context.request.post(`${origin}/api/login`, {
    data: { username: opts.username, code: accessCode() },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok()) {
    const t = await res.text().catch(() => "");
    await context.close().catch(() => {});
    throw new Error(`POST /api/login ${res.status()} — ${t.slice(0, 400)}`);
  }
  const body = (await res.json()) as { sessionToken?: string };
  const token = body.sessionToken || "";
  const stamp = String(Date.now());

  const deviceId = `e2e_${opts.username.replace(/[^a-z0-9_]/gi, "_")}`;
  await context.addInitScript(
    (t: { token: string; dn: string; stamp: string; deviceId: string }) => {
      localStorage.setItem("cyrus_auth_session", "valid");
      localStorage.setItem("cyrus_auth_timestamp", t.stamp);
      localStorage.setItem("cyrus-user-role", "user");
      localStorage.setItem("cyrus-display-name", t.dn);
      if (t.token) localStorage.setItem("cyrus_session_token", t.token);
      localStorage.setItem("cyrus_device_id", t.deviceId);
      localStorage.setItem("cyrus-device-id", t.deviceId);
    },
    { token, dn: opts.displayName, stamp, deviceId },
  );

  const page = await context.newPage();
  await gotoWithDevRetry(page, `${origin}/`);
  // Legacy `client/` AccessGate exposes INITIALIZE; cyrus-ui gate uses Sign in — reject wrong Vite root early.
  await expect(page.getByRole("button", { name: "INITIALIZE" })).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("input-username")).not.toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: "Module workspace", exact: true }),
  ).toBeVisible({ timeout: 45_000 });
  return { context, page };
}

async function openCommsDialerTab(page: Page, baseURL: string | undefined, mode: "audio" | "video") {
  const origin = (baseURL || "http://127.0.0.1:3105").replace(/\/$/, "");
  const tab = mode === "video" ? "video" : "voice";
  await gotoWithDevRetry(page, `${origin}/comms?tab=${tab}`);
  const label = mode === "video" ? "VIDEO CALL" : "VOICE CALL";
  try {
    await expect(page.getByText("COMMS HUB")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(label).first()).toBeVisible({ timeout: 90_000 });
  } catch (err) {
    const url = page.url();
    const snippet = (await page.locator("body").innerText().catch(() => "")).slice(0, 2000);
    throw new Error(
      `Comms hub not found. url=${url}\n---- body (slice) ----\n${snippet}\n----\n${String(err)}`,
    );
  }
}

/** Header status: emerald pulse when `/cyrus-io` presence is connected. */
async function waitCommsPresenceConnected(page: Page) {
  await expect(page.getByText(/● live/)).toBeVisible({ timeout: 90_000 });
}

async function waitCalleeDialerCard(page: Page, calleeDisplayName: string) {
  await expect
    .poll(
      async () => {
        const card = page.getByRole("button", { name: new RegExp(calleeDisplayName, "i") });
        return await card.count();
      },
      { timeout: 90_000, intervals: [400, 800, 1500, 2500] },
    )
    .toBeGreaterThan(0);
}

async function runCallScenario(browser: Browser, baseURL: string | undefined, mode: "audio" | "video") {
  let ctxCaller: BrowserContext | undefined;
  let ctxCallee: BrowserContext | undefined;
  try {
    const caller = await newLoggedInCommsContext(browser, baseURL, {
      username: `e2e_call_caller_${mode}`,
      displayName: "E2E Caller",
    });
    ctxCaller = caller.context;
    const pageCaller = caller.page;

    const callee = await newLoggedInCommsContext(browser, baseURL, {
      username: `e2e_call_callee_${mode}`,
      displayName: "E2E Callee",
    });
    ctxCallee = callee.context;
    const pageCallee = callee.page;

    await openCommsDialerTab(pageCaller, baseURL, mode);
    await openCommsDialerTab(pageCallee, baseURL, mode);

    await waitCommsPresenceConnected(pageCaller);
    await waitCommsPresenceConnected(pageCallee);

    await waitCalleeDialerCard(pageCaller, "E2E Callee");

    await pageCaller.getByRole("button", { name: /E2E Callee/i }).click();

    await expect(pageCallee.getByText(/INCOMING.*CALL/i)).toBeVisible({ timeout: 45_000 });
    await pageCallee.getByRole("button", { name: /^ACCEPT$/i }).click({ force: true, timeout: 10_000 });

    const inCallRe = mode === "video" ? /video call/i : /audio call/i;
    await expect(pageCallee.getByText(inCallRe)).toBeVisible({ timeout: 60_000 });
    await expect(pageCaller.getByText(inCallRe)).toBeVisible({ timeout: 60_000 });

    await pageCaller.waitForTimeout(15_000);

    await pageCaller.getByTestId("comms-end-call").click();
    await expect(pageCaller.getByTestId("comms-end-call")).not.toBeVisible({ timeout: 30_000 });
  } finally {
    await ctxCaller?.close().catch(() => {});
    await ctxCallee?.close().catch(() => {});
  }
}

test.describe("Comms presence calls (two browsers)", () => {
  test.describe.configure({ mode: "serial" });

  test("voice: caller places audio quick call, callee accepts, both end", async ({ browser, baseURL }) => {
    await runCallScenario(browser, baseURL, "audio");
  });

  test("video: caller places video quick call, callee accepts, both end", async ({ browser, baseURL }) => {
    await runCallScenario(browser, baseURL, "video");
  });
});
