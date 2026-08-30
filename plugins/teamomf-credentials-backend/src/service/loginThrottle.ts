/**
 * A small in-memory throttle for failed login attempts.
 *
 * This is a real control, not decoration: without it, the /login endpoint is
 * an unbounded password oracle. It is deliberately per-process and in-memory,
 * which is sufficient for a single-backend deployment. A multi-replica
 * deployment should move this to the shared cache service.
 */
export class LoginThrottle {
  private readonly attempts = new Map<
    string,
    { count: number; blockedUntil?: number }
  >();

  constructor(
    private readonly maxAttempts: number = 10,
    private readonly blockDurationMs: number = 5 * 60 * 1000,
  ) {}

  /** Returns remaining block time in ms, or 0 if the key may proceed. */
  check(key: string, now: number = Date.now()): number {
    const entry = this.attempts.get(key);
    if (!entry?.blockedUntil) {
      return 0;
    }
    if (entry.blockedUntil <= now) {
      this.attempts.delete(key);
      return 0;
    }
    return entry.blockedUntil - now;
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const entry = this.attempts.get(key) ?? { count: 0 };
    entry.count += 1;
    if (entry.count >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
      entry.count = 0;
    }
    this.attempts.set(key, entry);
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }
}
