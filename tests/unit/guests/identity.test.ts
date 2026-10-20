import { describe, expect, it } from "vitest";
import { displayNameSchema, hashDeviceToken, newDeviceToken } from "@/server/guests/identity";

describe("device tokens", () => {
  it("are long, random and URL-safe", () => {
    const a = newDeviceToken();
    const b = newDeviceToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hash the same way with the same salt and differently with another", () => {
    const token = newDeviceToken();
    expect(hashDeviceToken(token, "salt-one-salt")).toBe(hashDeviceToken(token, "salt-one-salt"));
    expect(hashDeviceToken(token, "salt-one-salt")).not.toBe(hashDeviceToken(token, "salt-two-salt"));
    expect(hashDeviceToken(token, "salt-one-salt")).not.toContain(token);
  });
});

describe("displayNameSchema", () => {
  it("trims and collapses spaces", () => {
    expect(displayNameSchema.parse("  Mak   Cik  Kiah ")).toBe("Mak Cik Kiah");
  });

  it("accepts 1 to 40 characters", () => {
    expect(displayNameSchema.safeParse("A").success).toBe(true);
    expect(displayNameSchema.safeParse("x".repeat(40)).success).toBe(true);
    expect(displayNameSchema.safeParse("x".repeat(41)).success).toBe(false);
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects control characters", () => {
    expect(displayNameSchema.safeParse("Ali\u0000").success).toBe(false);
  });
});