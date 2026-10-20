import { describe, expect, it } from "vitest";
import { normalizeInviteEmail } from "@/server/events/members-rules";

describe("normalizeInviteEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeInviteEmail("  Kakak@Example.COM ")).toBe("kakak@example.com");
  });

  it("rejects invalid addresses", () => {
    expect(normalizeInviteEmail("not-an-email")).toBeNull();
    expect(normalizeInviteEmail("")).toBeNull();
  });
});