import { describe, expect, it } from "vitest";
import { computePurgeAt, nextPurgeAt } from "@/server/events/retention";

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

describe("nextPurgeAt", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  const startsAt = new Date("2026-12-12T03:00:00Z");
  const purgeAt = new Date("2027-01-11T03:00:00Z");

  it("keeps purgeAt when the date does not change", () => {
    const later = new Date("2027-06-01T00:00:00Z");
    expect(nextPurgeAt({ startsAt, purgeAt }, new Date(startsAt.getTime()), 30, later)).toBe(purgeAt);
  });

  it("keeps a null purgeAt when the date does not change", () => {
    expect(nextPurgeAt({ startsAt, purgeAt: null }, new Date(startsAt.getTime()), 30, now)).toBeNull();
  });

  it("recomputes purgeAt when the date changes", () => {
    const moved = new Date("2026-12-20T03:00:00Z");
    expect(nextPurgeAt({ startsAt, purgeAt }, moved, 30, now)?.getTime()).toBe(moved.getTime() + 30 * DAY);
  });
});
