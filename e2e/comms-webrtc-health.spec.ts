import { test, expect } from "@playwright/test";

/**
 * Validates the ops-facing WebRTC readiness endpoint (no auth).
 * Requires dev server (Playwright webServer) or PLAYWRIGHT_SKIP_WEBSERVER=1 with a running API.
 */
test.describe("Comms WebRTC health", () => {
  test("GET /api/comms/webrtc-health returns stable JSON", async ({ request }) => {
    const res = await request.get("/api/comms/webrtc-health");
    expect(res.ok(), await res.text().catch(() => "")).toBeTruthy();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(typeof body.relayConfigured).toBe("boolean");
    expect(typeof body.iceServerCount).toBe("number");
    expect(["all", "relay", undefined]).toContain(body.iceTransportPolicy);
  });
});
