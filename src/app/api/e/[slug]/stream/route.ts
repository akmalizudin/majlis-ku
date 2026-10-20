import { readGuestContext } from "@/server/guests/context";
import { ApiError, handle } from "@/server/http";
import { toGuestMessage } from "@/server/realtime/bus";
import { sseResponse } from "@/server/realtime/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live updates for the public guest gallery: visible items only, never the original file. */
export const GET = handle(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const context = await readGuestContext(slug);
  if (!context || context.event.galleryVisibility !== "GUESTS" || !context.pinOk) throw new ApiError("not_found", 404);
  return sseResponse(request, context.event.id, toGuestMessage);
});
