import { describe, expect, it } from "vitest";
import { secretMatches } from "@/server/security/secret";

describe("secretMatches", () => {
  it("matches only the exact secret", () => {
    const secret = "correct-horse-battery";
    expect(secretMatches(secret, secret)).toBe(true);
    expect(secretMatches("wrong-horse-battery-x", secret)).toBe(false);
    expect(secretMatches("correct-horse", secret)).toBe(false);
    expect(secretMatches(`${secret}-and-more`, secret)).toBe(false);
    expect(secretMatches("", secret)).toBe(false);
    expect(secretMatches(null, secret)).toBe(false);
    expect(secretMatches(undefined, secret)).toBe(false);
  });
});
