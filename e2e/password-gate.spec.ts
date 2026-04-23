import { test, expect } from "@playwright/test";

function accessCode(): string {
  const fromEnv = process.env.CYRUS_E2E_ACCESS_CODE || process.env.USER_ACCESS_CODE;
  if (fromEnv?.trim()) return fromEnv.trim();
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Set CYRUS_E2E_ACCESS_CODE or USER_ACCESS_CODE for gate E2E in production.",
    );
  }
  return "170392";
}

test.describe("Password gate", () => {
  test("username and access code submit and persist authenticated session", async ({ page }) => {
    await page.goto("/");

    const usernameInput = page.getByTestId("input-username");
    await expect(usernameInput).toBeVisible({ timeout: 30_000 });
    await expect(usernameInput).toBeFocused();
    await usernameInput.fill("PlaywrightGateUser");
    await page.getByTestId("input-password").fill(accessCode());
    await page.getByTestId("button-submit-password").click();

    await page.waitForFunction(
      () => localStorage.getItem("cyrus_auth_session") === "valid",
      { timeout: 20_000 },
    );
  });

  test("invalid code shows error and keeps password field editable; valid code signs in", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("input-username")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("input-username").fill("E2E Retry User");
    await page.getByTestId("input-password").fill("definitely-wrong-code");

    await expect(page.getByTestId("button-submit-password")).toBeEnabled();
    const loginRejected = page.waitForResponse(
      (res) => res.url().includes("/api/login") && res.status() === 401,
    );
    await page.getByTestId("button-submit-password").click();
    await loginRejected;

    await expect(page.getByTestId("gate-error")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("gate-error")).toContainText(/invalid access code|ACCESS DENIED/i);
    await expect(page.getByTestId("input-password")).toHaveValue("definitely-wrong-code");

    await page.getByTestId("input-password").fill(accessCode());
    await page.getByTestId("button-submit-password").click();

    await page.waitForFunction(
      () => localStorage.getItem("cyrus_auth_session") === "valid",
      { timeout: 20_000 },
    );
  });
});
