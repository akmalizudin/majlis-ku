import type { EventMemberRole, ModerationState } from "@prisma/client";

export type ModerationAction = "approve" | "hide" | "show";
export type MemberRole = EventMemberRole | "ADMIN";

/** The new state for an action, or null when the action does not apply to the current state. */
export function nextModeration(current: ModerationState, action: ModerationAction): ModerationState | null {
  switch (action) {
    case "approve":
      return current === "PENDING_APPROVAL" ? "VISIBLE" : null;
    case "hide":
      return current === "HIDDEN" ? null : "HIDDEN";
    case "show":
      return current === "HIDDEN" ? "VISIBLE" : null;
  }
}

export function canModerate(role: MemberRole): boolean {
  return role === "OWNER" || role === "COHOST" || role === "ADMIN";
}

export function canManageMembers(role: MemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canDeleteEvent(role: MemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}