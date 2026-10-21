import type { EventMemberRole, EventStatus, ModerationState } from "@prisma/client";

export type ModerationAction = "approve" | "hide" | "show";
export type MemberRole = EventMemberRole | "ADMIN";
export type EventAccess = { memberRole: MemberRole; status: EventStatus };

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

/** Archived events (guest data purged) are read-only for everyone. */
export function canModerate(event: EventAccess): boolean {
  return (event.memberRole === "OWNER" || event.memberRole === "COHOST") && event.status !== "ARCHIVED";
}

/** Admins are read-only on host dashboards; they act through /admin. */
export function canEditEvent(event: EventAccess): boolean {
  return canModerate(event);
}

export function canManageMembers(role: MemberRole): boolean {
  return role === "OWNER";
}

export function canDeleteEvent(role: MemberRole): boolean {
  return role === "OWNER";
}
