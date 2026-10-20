import { env } from "@/lib/env";
import { eventIcs } from "@/server/ecard/ics";
import { findPublicCard } from "@/server/ecard/service";
import { ApiError, handle } from "@/server/http";

/** GET — "Add to calendar" for a published card. */
export const GET = handle(async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const found = await findPublicCard(slug);
  if (!found) throw new ApiError("not_found", 404);
  const { event, card } = found;
  const url = `${env().NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/i/${slug}`;
  const location = [event.venueName, event.venueAddress].filter(Boolean).join(", ") || null;
  const ics = eventIcs({
    uid: `${event.id}@majlisku`,
    title: `${card.content.headline || event.title} — ${card.content.names || event.hostNames}`,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location,
    description: `${card.content.intro}\n${url}`.trim(),
    url,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="majlis-${slug}.ics"`,
    },
  });
});
