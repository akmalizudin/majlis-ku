import "server-only";
import { requireEventMemberApi } from "@/server/events/access";
import { ApiError } from "@/server/http";
import { canModerate } from "@/server/moderation/rules";

/** API routes for the card builder: a host of this event on a plan that includes the e-card. */
export async function requireCardEditor(eventId: string) {
  const { user, event } = await requireEventMemberApi(eventId);
  if (!canModerate(event)) throw new ApiError("forbidden", 403);
  if (!event.plan.includesEcard) throw new ApiError("not_in_plan", 403);
  return { user, event };
}