import { describe, expect, it } from "vitest";
import { formatSen, parseRinggit } from "@/lib/money";

describe("formatSen", () => {
  it("formats sen as ringgit with two decimals", () => {
    expect(formatSen(4000)).toBe("RM 40.00");
    expect(formatSen(12050)).toBe("RM 120.50");
    expect(formatSen(0)).toBe("RM 0.00");
  });

  it("groups thousands", () => {
    expect(formatSen(123456789)).toBe("RM 1,234,567.89");
  });

  it("rejects non-integer or negative sen", () => {
    expect(() => formatSen(10.5)).toThrow();
    expect(() => formatSen(-1)).toThrow();
  });
});

describe("parseRinggit", () => {
  it("parses ringgit strings into sen", () => {
    expect(parseRinggit("40")).toBe(4000);
    expect(parseRinggit("120.5")).toBe(12050);
    expect(parseRinggit("RM 1,234.56")).toBe(123456);
  });

  it("rejects fractions of a sen, negatives and junk", () => {
    expect(() => parseRinggit("1.234")).toThrow();
    expect(() => parseRinggit("-5")).toThrow();
    expect(() => parseRinggit("abc")).toThrow();
  });
});