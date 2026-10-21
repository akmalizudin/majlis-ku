import { requireEventMemberApi } from "@/server/events/access";
import { eventWishesPdf } from "@/server/export/event-export";
import { ApiError, handle } from "@/server/http";
import { canEditEvent } from "@/server/moderation/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — the wishes guestbook as a printable PDF. */
export const GET = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  if (!canEditEvent(event.memberRole)) throw new ApiError("forbidden", 403);
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ms";
  const pdf = await eventWishesPdf(event, locale);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ucapan-${event.slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});