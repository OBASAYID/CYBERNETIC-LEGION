import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

/** Same gate secrets as the Node server (`USER_ACCESS_CODE` / `CYRUS_E2E_ACCESS_CODE`). */
loadEnv();

const port = process.env.CYRUS_LIVE_PORT || process.env.PORT || "3105";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
/** Set `PLAYWRIGHT_USE_SYSTEM_CHROME=1` to use Google Chrome from `/Applications` (no Chromium download). Otherwise use bundled Chromium from `npm run test:e2e:install`. */
const useSystemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1";

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
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(useSystemChrome ? { channel: "chrome" as const } : {}),
      },
    },
  ],
});
