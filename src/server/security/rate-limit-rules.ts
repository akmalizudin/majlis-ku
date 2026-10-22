export type RateLimitResult = { ok: boolean; retryAfterSec: number };

// `count` already includes the current hit, so the limit-th hit is still allowed.
export function rateLimitResult(
  row: { count: number; windowStart: Date },
  limit: number,
  windowMs: number,
  now: Date,
): RateLimitResult {
  if (row.count <= limit) return { ok: true, retryAfterSec: 0 };
  const leftMs = row.windowStart.getTime() + windowMs - now.getTime();
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil(leftMs / 1000)) };
}
