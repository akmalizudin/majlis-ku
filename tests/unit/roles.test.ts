import { describe, expect, it } from "vitest";
import { canAccessAdmin, isAdminEmail } from "@/server/auth/roles";

describe("isAdminEmail", () => {
  const admins = ["admin@example.com", "ops@example.com"];

  it("matches case-insensitively and ignores surrounding spaces", () => {
    expect(isAdminEmail(" Admin@Example.COM ", admins)).toBe(true);
  });

  it("rejects other emails, empty lists and missing emails", () => {
    expect(isAdminEmail("host@example.com", admins)).toBe(false);
    expect(isAdminEmail("admin@example.com", [])).toBe(false);
    expect(isAdminEmail(null, admins)).toBe(false);
  });
});

describe("canAccessAdmin", () => {
  it("allows only the ADMIN role", () => {
    expect(canAccessAdmin({ role: "ADMIN" })).toBe(true);
    expect(canAccessAdmin({ role: "HOST" })).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
  });
});