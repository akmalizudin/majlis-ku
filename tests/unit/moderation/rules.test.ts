import { describe, expect, it } from "vitest";
import { canDeleteEvent, canManageMembers, canModerate, nextModeration } from "@/server/moderation/rules";

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
  it("lets owners, co-hosts and admins moderate", () => {
    expect(canModerate("OWNER")).toBe(true);
    expect(canModerate("COHOST")).toBe(true);
    expect(canModerate("ADMIN")).toBe(true);
  });

  it("lets only owners and admins manage members and delete the event", () => {
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canManageMembers("COHOST")).toBe(false);
    expect(canDeleteEvent("OWNER")).toBe(true);
    expect(canDeleteEvent("COHOST")).toBe(false);
  });
});