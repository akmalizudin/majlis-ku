import { requireEventMemberApi } from "@/server/events/access";
import { ApiError, handle } from "@/server/http";
import { canEditEvent } from "@/server/moderation/rules";
import { rsvpCsv, rsvpXlsx } from "@/server/rsvp/export";
import { listRsvps } from "@/server/rsvp/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?format=csv|xlsx&locale=ms|en — the RSVP list for the hosts. */
export const GET = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  if (!canEditEvent(event.memberRole)) throw new ApiError("forbidden", 403);
  const search = new URL(request.url).searchParams;
  const locale = search.get("locale") === "en" ? "en" : "ms";
  const rows = await listRsvps(event.id);
  if (search.get("format") === "xlsx") {
    return new Response(new Uint8Array(await rsvpXlsx(rows, locale)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rsvp-${event.slug}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  return new Response(rsvpCsv(rows, locale), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvp-${event.slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
});