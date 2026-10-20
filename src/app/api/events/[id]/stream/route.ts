import { requireEventMemberApi } from "@/server/events/access";
import { handle } from "@/server/http";
import { sseResponse } from "@/server/realtime/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live updates for the host gallery and the slideshow: every item, whatever its moderation state. */
export const GET = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  return sseResponse(request, event.id);
});