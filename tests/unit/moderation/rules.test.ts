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
    expect(canModerate("OWNER")).toBe(true);
    expect(canModerate("COHOST")).toBe(true);
  });

  it("lets only owners manage members and delete the event", () => {
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("COHOST")).toBe(false);
    expect(canDeleteEvent("OWNER")).toBe(true);
    expect(canDeleteEvent("COHOST")).toBe(false);
  });

  it("lets owners and co-hosts edit the event", () => {
    expect(canEditEvent("OWNER")).toBe(true);
    expect(canEditEvent("COHOST")).toBe(true);
  });

  it("makes admins read-only on host dashboards", () => {
    expect(canModerate("ADMIN")).toBe(false);
    expect(canManageMembers("ADMIN")).toBe(false);
    expect(canDeleteEvent("ADMIN")).toBe(false);
    expect(canEditEvent("ADMIN")).toBe(false);
  });
});
