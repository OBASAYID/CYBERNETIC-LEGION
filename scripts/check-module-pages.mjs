/**
 * Quick smoke check: module routes render visible headings (not blank / error boundary).
 * Usage: node scripts/check-module-pages.mjs [baseURL]
 */
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://127.0.0.1:3105").replace(/\/$/, "");
const routes = [
  { path: "/files", heading: /document intelligence/i },
  { path: "/scan", heading: /vision/i },
  { path: "/document-builder", heading: /document builder/i },
];

const loginRes = await fetch(`${base}/api/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "ModuleCheck", code: "71580019" }),
});
if (!loginRes.ok) {
  console.error("Login failed:", loginRes.status, await loginRes.text());
  process.exit(1);
}
const { sessionToken } = await loginRes.json();

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (e) {
  console.error("Playwright chromium not installed. Run: npx playwright install chromium");
  process.exit(1);
}

const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));

await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await page.evaluate(
  ([token]) => {
    localStorage.setItem("cyrus_auth_session", "valid");
    localStorage.setItem("cyrus_auth_timestamp", String(Date.now()));
    localStorage.setItem("cyrus-user-role", "admin");
    localStorage.setItem("cyrus-display-name", "ModuleCheck");
    localStorage.setItem("cyrus_session_token", token);
    localStorage.setItem("cyrus-user-id", "module-check-user");
  },
  [sessionToken],
);

let failed = false;
for (const { path, heading } of routes) {
  errors.length = 0;
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const h = page.getByRole("heading", { name: heading });
  const loading = page.getByText("LOADING MODULE…");
  await Promise.race([
    h.first().waitFor({ state: "visible", timeout: 90_000 }),
    loading.waitFor({ state: "visible", timeout: 5_000 }).then(() =>
      loading.waitFor({ state: "hidden", timeout: 90_000 }),
    ).then(() => h.first().waitFor({ state: "visible", timeout: 30_000 })),
  ]).catch(() => {});
  const fault = await page.getByRole("heading", { name: "UI SURFACE FAULT" }).count();
  const visible = await h.first().isVisible().catch(() => false);
  const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 200);
  console.log(`\n${path}:`);
  console.log(`  heading visible: ${visible}`);
  console.log(`  error boundary: ${fault > 0}`);
  console.log(`  page errors: ${errors.length ? errors.join(" | ") : "none"}`);
  console.log(`  body preview: ${bodyText.replace(/\s+/g, " ").trim()}`);
  if (fault > 0 || errors.length || !visible) failed = true;
}

await browser.close();
process.exit(failed ? 1 : 0);
