/**
 * Negotiation safety: serialized negotiation chain + minimum gap (glare / storm mitigation).
 */

export class RtcNegotiationCoordinator {
  private lastNegotiationEnd = 0;
  private readonly minGapMs: number;
  private chain: Promise<void> = Promise.resolve();

  constructor(minGapMs = 450) {
    this.minGapMs = minGapMs;
  }

  /** Returns false if another negotiation should wait (debounce). */
  canStartNegotiation(now = Date.now()): boolean {
    return now - this.lastNegotiationEnd >= this.minGapMs;
  }

  markNegotiationEnd(now = Date.now()): void {
    this.lastNegotiationEnd = now;
  }

  /**
   * Run one SDP step after the previous completes and after any mandatory cool-down.
   * Use for offer/answer creation to avoid overlapping setLocal/setRemote races.
   */
  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const wait = Math.max(0, this.minGapMs - (Date.now() - this.lastNegotiationEnd));
      if (wait > 0) {
        await new Promise<void>((r) => setTimeout(r, wait));
      }
      try {
        return await fn();
      } finally {
        this.lastNegotiationEnd = Date.now();
      }
    });
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  reset(): void {
    this.lastNegotiationEnd = 0;
    this.chain = Promise.resolve();
  }
}
