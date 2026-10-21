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
  const admins = ["admin@example.com"];

  it("requires the ADMIN role and an email still in ADMIN_EMAILS", () => {
    expect(canAccessAdmin({ role: "ADMIN", email: "gone@example.com" }, admins)).toBe(false);
    expect(canAccessAdmin({ role: "ADMIN", email: " Admin@Example.com " }, admins)).toBe(true);
    expect(canAccessAdmin({ role: "HOST", email: "admin@example.com" }, admins)).toBe(false);
    expect(canAccessAdmin(null, admins)).toBe(false);
  });
});
