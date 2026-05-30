/**
 * Best-effort recovery for browser audio / autoplay restrictions during CYRUS calls.
 */

/** Try to resume playback on in-page media elements (remote call audio/video). */
export async function resumeCyrusAudioPipeline(): Promise<boolean> {
  let anyOk = false;
  try {
    const nodes = document.querySelectorAll('[data-cyrus-remote-call="1"], audio[data-cyrus-remote-call="1"]');
    for (const el of nodes) {
      try {
        if (el instanceof HTMLMediaElement) {
          el.muted = false;
          await el.play();
          anyOk = true;
        }
      } catch {
        /* ignore per-element */
      }
    }
    // Fallback: legacy remote call videos without data attribute (skip local PIP)
    if (!anyOk) {
      for (const el of document.querySelectorAll("video:not([data-cyrus-local-pip])")) {
        try {
          if (el instanceof HTMLVideoElement) {
            el.muted = false;
            await el.play();
            anyOk = true;
          }
        } catch {
          /* ignore */
        }
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
