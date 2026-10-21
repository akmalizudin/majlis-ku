// Fixed-window rate limiter kept in process memory. Fine for one local server; a shared store
// (Postgres or Redis) replaces it when the app runs on more than one instance (phase 8).

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { start: number; count: number }>();

  function hit(key: string, now = Date.now()): RateLimitResult {
    const current = windows.get(key);
    if (!current || now - current.start >= windowMs) {
      windows.set(key, { start: now, count: 1 });
      if (windows.size > 10_000) prune(now);
      return { ok: true, retryAfterSec: 0 };
    }
    if (current.count >= limit) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.start + windowMs - now) / 1000)) };
    }
    current.count += 1;
    return { ok: true, retryAfterSec: 0 };
  }

  function prune(now: number) {
    for (const [key, value] of windows) if (now - value.start >= windowMs) windows.delete(key);
  }

  function reset(key: string) {
    windows.delete(key);
  }

  return { hit, reset };
}

const MINUTE = 60_000;

// Shared limiters for the guest API. Keys are device hashes or salted IP hashes, never raw IPs.
export const limiters = {
  uploadStart: createRateLimiter({ limit: 120, windowMs: 10 * MINUTE }),
  wish: createRateLimiter({ limit: 20, windowMs: 10 * MINUTE }),
  guestJoin: createRateLimiter({ limit: 30, windowMs: 10 * MINUTE }),
  pinAttempt: createRateLimiter({ limit: 5, windowMs: 10 * MINUTE }),
  rsvp: createRateLimiter({ limit: 10, windowMs: 10 * MINUTE }),
  report: createRateLimiter({ limit: 5, windowMs: 10 * MINUTE }),
};