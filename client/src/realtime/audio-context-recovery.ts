/**
 * Best-effort recovery for browser audio / autoplay restrictions during CYRUS calls.
 */

/** Try to resume playback on all in-page video elements (often carries remote audio). */
export async function resumeCyrusAudioPipeline(): Promise<boolean> {
  let anyOk = false;
  try {
    const nodes = document.querySelectorAll("video");
    for (const el of nodes) {
      try {
        el.muted = false;
        await el.play();
        anyOk = true;
      } catch {
        /* ignore per-element */
      }
    }
  } catch {
    return false;
  }
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      if (ctx.state === "suspended") {
        await ctx.resume();
        anyOk = true;
      }
      await ctx.close();
    }
  } catch {
    /* ignore */
  }
  return anyOk;
}
