import { describe, expect, it } from "vitest";
import { rateLimitResult } from "@/server/security/rate-limit-rules";

const WINDOW = 600_000;
const start = new Date("2026-10-21T00:00:00Z");

describe("rateLimitResult", () => {
  it("allows up to the limit", () => {
    expect(rateLimitResult({ count: 3, windowStart: start }, 3, WINDOW, new Date(start.getTime() + 1000))).toEqual({
      ok: true,
      retryAfterSec: 0,
    });
  });

  it("blocks over the limit with the seconds left in the window", () => {
    const now = new Date(start.getTime() + 400_000);
    expect(rateLimitResult({ count: 4, windowStart: start }, 3, WINDOW, now)).toEqual({ ok: false, retryAfterSec: 200 });
  });

  it("never asks to wait less than a second", () => {
    const now = new Date(start.getTime() + WINDOW - 1);
    expect(rateLimitResult({ count: 4, windowStart: start }, 3, WINDOW, now)).toEqual({ ok: false, retryAfterSec: 1 });
  });
});
