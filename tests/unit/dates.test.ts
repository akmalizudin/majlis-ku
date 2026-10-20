import { describe, expect, it } from "vitest";
import { formatEventDate, klLocalToUtc, utcToKlLocal } from "@/lib/dates";

describe("formatEventDate", () => {
  // 2026-11-14 02:00 UTC is 10:00 in Kuala Lumpur (UTC+8).
  const instant = new Date("2026-11-14T02:00:00Z");

  it("shows the instant in Asia/Kuala_Lumpur in Malay", () => {
    const text = formatEventDate(instant, "ms");
    expect(text).toContain("14");
    expect(text).toContain("November");
    expect(text).toContain("2026");
    expect(text).toMatch(/10[.:]00/);
  });

  it("shows the instant in Asia/Kuala_Lumpur in English", () => {
    const text = formatEventDate(instant, "en");
    expect(text).toContain("14 November 2026");
    expect(text).toMatch(/10:00/);
  });
});

describe("klLocalToUtc and utcToKlLocal", () => {
  it("converts a Kuala Lumpur wall-clock time to UTC", () => {
    expect(klLocalToUtc("2026-11-14T10:00").toISOString()).toBe("2026-11-14T02:00:00.000Z");
  });

  it("round-trips across midnight", () => {
    const utc = klLocalToUtc("2026-11-15T01:30");
    expect(utc.toISOString()).toBe("2026-11-14T17:30:00.000Z");
    expect(utcToKlLocal(utc)).toBe("2026-11-15T01:30");
  });

  it("rejects malformed input", () => {
    expect(() => klLocalToUtc("14/11/2026")).toThrow();
  });
});
