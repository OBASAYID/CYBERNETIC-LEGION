/**
 * Verify mediasoup SFU worker availability (ops / CI).
 */
import { initCyrusSfu, getSfuStatus } from "../server/comms/sfu/sfu-manager.js";

async function main() {
  await initCyrusSfu();
  const status = getSfuStatus();
  console.log(JSON.stringify(status, null, 2));
  if (status.mode === "mediasoup" && status.mediasoupAvailable) {
    console.log("[SFU] OK — mediasoup worker online");
    process.exit(0);
  }
  console.log("[SFU] Star relay mode — mediasoup worker not available on this host");
  process.exit(process.env.CYRUS_REQUIRE_SFU === "true" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
