import { requireEventMemberApi } from "@/server/events/access";
import { eventZipStream } from "@/server/export/event-export";
import { ApiError, handle } from "@/server/http";
import { canEditEvent } from "@/server/moderation/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — a ZIP of every original upload plus the wishes (PDF and CSV), streamed. */
export const GET = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  if (!canEditEvent(event.memberRole)) throw new ApiError("forbidden", 403);
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ms";
  return new Response(await eventZipStream(event, locale), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="majlis-${event.slug}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
});
