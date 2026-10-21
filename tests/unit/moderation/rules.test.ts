import { describe, expect, it } from "vitest";
import { canDeleteEvent, canEditEvent, canManageMembers, canModerate, nextModeration } from "@/server/moderation/rules";

describe("nextModeration", () => {
  it("approves only waiting items", () => {
    expect(nextModeration("PENDING_APPROVAL", "approve")).toBe("VISIBLE");
    expect(nextModeration("VISIBLE", "approve")).toBeNull();
    expect(nextModeration("HIDDEN", "approve")).toBeNull();
  });

  it("hides visible or waiting items", () => {
    expect(nextModeration("VISIBLE", "hide")).toBe("HIDDEN");
    expect(nextModeration("PENDING_APPROVAL", "hide")).toBe("HIDDEN");
    expect(nextModeration("HIDDEN", "hide")).toBeNull();
  });

  it("shows hidden items again", () => {
    expect(nextModeration("HIDDEN", "show")).toBe("VISIBLE");
    expect(nextModeration("VISIBLE", "show")).toBeNull();
  });
});

describe("roles", () => {
  it("lets owners and co-hosts moderate", () => {
    expect(canModerate({ memberRole: "OWNER", status: "ACTIVE" })).toBe(true);
    expect(canModerate({ memberRole: "COHOST", status: "ACTIVE" })).toBe(true);
  });

  it("lets only owners manage members and delete the event", () => {
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("COHOST")).toBe(false);
    expect(canDeleteEvent("OWNER")).toBe(true);
    expect(canDeleteEvent("COHOST")).toBe(false);
  });

  it("lets owners and co-hosts edit the event", () => {
    expect(canEditEvent({ memberRole: "OWNER", status: "ACTIVE" })).toBe(true);
    expect(canEditEvent({ memberRole: "COHOST", status: "ACTIVE" })).toBe(true);
  });

  it("makes admins read-only on host dashboards", () => {
    expect(canModerate({ memberRole: "ADMIN", status: "ACTIVE" })).toBe(false);
    expect(canManageMembers("ADMIN")).toBe(false);
    expect(canDeleteEvent("ADMIN")).toBe(false);
    expect(canEditEvent({ memberRole: "ADMIN", status: "ACTIVE" })).toBe(false);
  });

  it("makes archived events read-only for owners and co-hosts", () => {
    expect(canEditEvent({ memberRole: "OWNER", status: "ARCHIVED" })).toBe(false);
    expect(canModerate({ memberRole: "COHOST", status: "ARCHIVED" })).toBe(false);
    expect(canEditEvent({ memberRole: "COHOST", status: "SUSPENDED" })).toBe(true);
    expect(canModerate({ memberRole: "OWNER", status: "SUSPENDED" })).toBe(true);
    expect(canEditEvent({ memberRole: "ADMIN", status: "ARCHIVED" })).toBe(false);
    expect(canModerate({ memberRole: "ADMIN", status: "SUSPENDED" })).toBe(false);
  });
});
