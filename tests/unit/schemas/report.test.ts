import { describe, expect, it } from "vitest";
import { reportSchema, reportSlugSchema } from "@/lib/schemas/report";

describe("reportSchema", () => {
  it("accepts a reason with optional details", () => {
    expect(reportSchema.parse({ reason: "SCAM", details: "Fake giveaway" })).toEqual({
      reason: "SCAM",
      details: "Fake giveaway",
    });
    expect(reportSchema.parse({ reason: "OTHER" })).toEqual({ reason: "OTHER", details: null });
  });

  it("rejects an unknown or missing reason and unknown fields", () => {
    expect(reportSchema.safeParse({ reason: "SPAM" }).success).toBe(false);
    expect(reportSchema.safeParse({ details: "x" }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: "SCAM", extra: "x" }).success).toBe(false);
  });

  it("trims details and turns empty into null", () => {
    expect(reportSchema.parse({ reason: "HATE", details: "  hi  " }).details).toBe("hi");
    expect(reportSchema.parse({ reason: "HATE", details: "   " }).details).toBeNull();
    expect(reportSchema.parse({ reason: "HATE", details: "" }).details).toBeNull();
  });

  it("rejects details over 1000 characters", () => {
    expect(reportSchema.safeParse({ reason: "HATE", details: "a".repeat(1000) }).success).toBe(true);
    expect(reportSchema.safeParse({ reason: "HATE", details: "a".repeat(1001) }).success).toBe(false);
  });

  it("counts CRLF newlines as one character", () => {
    const lines = ["aa", ...Array<string>(499).fill("a")]; // 1000 characters with "\n", 1499 with "\r\n"
    const parsed = reportSchema.parse({ reason: "HATE", details: lines.join("\r\n") });
    expect(parsed.details).toBe(lines.join("\n"));
    expect(parsed.details).toHaveLength(1000);
    expect(reportSchema.safeParse({ reason: "HATE", details: `${lines.join("\r\n")}b` }).success).toBe(false);
  });
});

describe("reportSlugSchema", () => {
  it("rejects slugs that could form a redirect", () => {
    for (const bad of ["/evil.com", "a/b", "", "a.b", "A-b", "x".repeat(81)]) expect(reportSlugSchema.safeParse(bad).success).toBe(false);
    expect(reportSlugSchema.safeParse("aisyah-daniel-x7k2p").success).toBe(true);
  });
});
