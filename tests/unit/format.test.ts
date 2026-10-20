import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration } from "@/lib/format";

describe("formatBytes", () => {
  it("picks a unit and rounds", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(15n * 1024n * 1024n)).toBe("15.0 MB");
    expect(formatBytes(250 * 1024 * 1024)).toBe("250 MB");
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(59.6)).toBe("1:00");
  });
});