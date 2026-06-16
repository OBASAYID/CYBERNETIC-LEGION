#!/usr/bin/env node
/**
 * Verify comms stack readiness for production scale (TURN, Redis, SFU, push).
 */
const base = process.env.CYRUS_VERIFY_URL || `http://127.0.0.1:${process.env.CYRUS_LIVE_PORT || process.env.PORT || 3020}`;

async function get(path) {
  const res = await fetch(`${base}${path}`);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const checks = [];

async function main() {
  const ready = await get("/health/ready");
  checks.push({ name: "health/ready", pass: ready.ok, detail: ready.status });

  const deploy = await get("/api/stack/deployment");
  const d = deploy.body || {};
  checks.push({
    name: "TURN configured",
    pass: Boolean(d.webrtc?.turnConfigured),
    detail: d.webrtc?.turnConfigured ? "yes" : "set TURN_URLS + TURN_SECRET",
  });
  checks.push({
    name: "Redis signaling",
    pass: Boolean(d.webrtc?.redisSignaling),
    detail: d.webrtc?.redisSignaling ? "yes" : "set REDIS_URL",
  });
  checks.push({
    name: "SFU announced IP",
    pass: Boolean(d.webrtc?.sfuAnnouncedIp),
    detail: d.webrtc?.sfuAnnouncedIp || "set CYRUS_SFU_ANNOUNCED_IP",
  });

  const push = await get("/api/comms/push/status");
  checks.push({
    name: "push scaffold",
    pass: push.ok,
    detail: push.body?.configured ? "FCM configured" : "optional — set FCM_SERVER_KEY",
  });

  const rtc = await get("/api/comms/webrtc-health");
  checks.push({
    name: "webrtc-health",
    pass: rtc.ok && rtc.body?.relayConfigured === true,
    detail: rtc.body?.relayConfigured
      ? `${rtc.body.iceServerCount} ICE servers`
      : "no TURN relay in ICE list",
  });

  const failed = checks.filter((c) => !c.pass);
  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} check(s) need attention for international scale.`);
    process.exit(1);
  }
  console.log("\nComms stack verification passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
