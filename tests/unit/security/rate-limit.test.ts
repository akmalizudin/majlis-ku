import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/server/security/rate-limit";

describe("createRateLimiter", () => {
  it("allows the limit, blocks the next hit, and resets after the window", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    const t0 = 10_000;
    expect(limiter.hit("k", t0).ok).toBe(true);
    expect(limiter.hit("k", t0 + 1).ok).toBe(true);
    expect(limiter.hit("k", t0 + 2).ok).toBe(true);
    const blocked = limiter.hit("k", t0 + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
    expect(limiter.hit("k", t0 + 1000).ok).toBe(true);
  });

  it("keeps keys separate", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("b", 0).ok).toBe(true);
    expect(limiter.hit("a", 1).ok).toBe(false);
  });

  it("can be reset for a key", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.hit("a", 0);
    limiter.reset("a");
    expect(limiter.hit("a", 1).ok).toBe(true);
  });
});