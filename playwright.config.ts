import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

/** Same gate secrets as the Node server (`USER_ACCESS_CODE` / `CYRUS_E2E_ACCESS_CODE`). */
loadEnv();

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";
/** When Playwright starts `webServer`, force a single port so `.env` `CYRUS_LIVE_PORT` cannot desync `baseURL`. */
const port = skipWebServer
  ? String(process.env.CYRUS_LIVE_PORT || process.env.PORT || "3105")
  : String(process.env.PLAYWRIGHT_SERVER_PORT || "3105");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
/** Set `PLAYWRIGHT_USE_SYSTEM_CHROME=1` to use Google Chrome from `/Applications` (no Chromium download). Otherwise use bundled Chromium from `npm run test:e2e:install`. */
const useSystemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: "npx tsx server/index.ts",
        cwd: repoRoot,
        url: `http://127.0.0.1:${port}/health/ready`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: port,
          CYRUS_LIVE_PORT: port,
          CYRUS_SINGLE_ORIGIN: "1",
          NODE_ENV: "development",
          // Always fuse `cyrus-ui` for Playwright-started servers — a repo `.env` may set `CYRUS_UI_ROOT=client`,
          // which would serve legacy `AccessGate` and break E2E that expect the unified shell.
          CYRUS_UI_ROOT: "cyrus-ui",
          TMPDIR: process.env.TMPDIR || "/tmp",
          USER_ACCESS_CODE: process.env.USER_ACCESS_CODE || "170392",
          ADMIN_ACCESS_CODE: process.env.ADMIN_ACCESS_CODE || "71580019",
          CYRUS_SESSION_STORE: process.env.CYRUS_SESSION_STORE || "memory",
        },
      },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(useSystemChrome ? { channel: "chrome" as const } : {}),
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],
});
