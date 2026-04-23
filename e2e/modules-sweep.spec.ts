import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

async function gotoWithDevRetry(
  page: import("@playwright/test").Page,
  url: string,
  maxAttempts = 3,
) {
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

/**
 * All primary routes from `cyrus-ui/src/app-routes.tsx` + `command-center-routes.tsx`.
 * Visiting each after gate login catches lazy-load / runtime surface faults (error boundary, uncaught throws).
 */
const APP_ROUTES = [
  "/",
  "/dashboard-legacy",
  "/drone-control",
  "/ai-dashboard",
  "/ai-assistant",
  "/trading",
  "/design",
  "/device-control",
  "/navigation",
  "/file-analysis",
  "/document-builder",
] as const;

const COMMAND_MODULE_ROUTES = [
  "/algorithms",
  "/modules",
  "/scan",
  "/files",
  "/nav",
  "/comms",
  "/device",
  "/drone",
  "/medical",
  "/quantum",
  "/security",
  "/biology",
  "/blood",
  "/ops",
] as const;

function accessCode(): string {
  const fromEnv = process.env.CYRUS_E2E_ACCESS_CODE || process.env.USER_ACCESS_CODE;
  if (fromEnv?.trim()) return fromEnv.trim();
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set CYRUS_E2E_ACCESS_CODE or USER_ACCESS_CODE for E2E.");
  }
  return "170392";
}

/**
 * Same-origin `page.request` shares the browser cookie jar, so `POST /api/login` is visible to
 * `fetch` in the app. We seed localStorage to match a successful gate and reload so the
 * UI mounts past `PasswordGate` (avoids brittle UI typing when Vite is still warming).
 */
async function passPasswordGate(
  page: import("@playwright/test").Page,
  baseURL: string | undefined,
) {
  const origin = (baseURL || "http://127.0.0.1:3105").replace(/\/$/, "");
  await gotoWithDevRetry(page, `${origin}/`);
  const res = await page.request.post(`${origin}/api/login`, {
    data: { username: "E2E ModuleSweep", code: accessCode() },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok()) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /api/login ${res.status()} — ${text.slice(0, 200)}`);
  }
  // Avoid `evaluate` while Vite is still hot-reloading / navigating the shell.
  await page.waitForLoadState("load").catch(() => {});
  const ts = String(Date.now());
  await page.evaluate(
    ([stamp]) => {
      localStorage.setItem("cyrus_auth_session", "valid");
      localStorage.setItem("cyrus_auth_timestamp", stamp);
      localStorage.setItem("cyrus-user-role", "user");
      localStorage.setItem("cyrus-display-name", "E2E ModuleSweep");
      localStorage.setItem("cyrus_session_token", "e2e-sweep");
    },
    [ts],
  );
  await gotoWithDevRetry(page, `${origin}/`);
  await expect(page.getByTestId("input-username")).not.toBeVisible({ timeout: 45_000 });
}

test.describe("All modules / surfaces (lazy routes)", () => {
  test("each registered route loads without error boundary and without page errors", async ({
    page,
    baseURL,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(`${err.message}`);
    });

    await passPasswordGate(page, baseURL);

    const all = [...APP_ROUTES, ...COMMAND_MODULE_ROUTES];
    const originBase = `${(baseURL || "http://127.0.0.1:3105").replace(/\/$/, "")}/`;
    for (const path of all) {
      pageErrors.length = 0;
      await test.step(`visit ${path}`, async () => {
        await gotoWithDevRetry(page, new URL(path, originBase).href);
        const loading = page.getByText("LOADING MODULE…");
        if (await loading.isVisible().catch(() => false)) {
          await expect(loading).toBeHidden({ timeout: 90_000 });
        }
        await expect(page.getByRole("heading", { name: "UI SURFACE FAULT" })).toHaveCount(0);
        expect(
          pageErrors,
          `Uncaught error on ${path}:\n${pageErrors.join("\n")}`,
        ).toEqual([]);
      });
    }
  });
});
