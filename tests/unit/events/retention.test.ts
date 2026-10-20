import { describe, expect, it } from "vitest";
import { computePurgeAt } from "@/server/events/retention";

const DAY = 24 * 60 * 60 * 1000;

describe("computePurgeAt", () => {
  const now = new Date("2026-10-20T00:00:00Z");

  it("counts retention from the event date when the event is in the future", () => {
    const startsAt = new Date("2026-12-12T03:00:00Z");
    expect(computePurgeAt({ startsAt, retentionDays: 30, now }).getTime()).toBe(startsAt.getTime() + 30 * DAY);
  });

  it("counts from now when the event date has passed", () => {
    const startsAt = new Date("2026-01-01T00:00:00Z");
    expect(computePurgeAt({ startsAt, retentionDays: 30, now }).getTime()).toBe(now.getTime() + 30 * DAY);
  });

  it("rejects a negative retention", () => {
    expect(() => computePurgeAt({ startsAt: now, retentionDays: -1, now })).toThrow();
  });
});