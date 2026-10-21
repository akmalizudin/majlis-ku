import { NextResponse } from "next/server";
import { findPublicCard } from "@/server/ecard/service";
import { ensureDeviceHash } from "@/server/guests/context";
import { ApiError, handle } from "@/server/http";
import { rsvpInputSchema, rsvpOpen } from "@/server/rsvp/rules";
import { submitRsvp } from "@/server/rsvp/service";
import { limiters } from "@/server/security/rate-limit";

/** A guest's RSVP. The same device sending again updates its earlier reply. */
export const POST = handle(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const found = await findPublicCard(slug);
  if (!found) throw new ApiError("not_found", 404);
  const { event, card } = found;
  if (!rsvpOpen(card.content)) throw new ApiError("rsvp_closed", 409);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("validation", 400);
  }
  const parsed = rsvpInputSchema({ maxPax: card.content.maxPax, askPhone: card.content.askPhone }).safeParse(body);
  if (!parsed.success) throw new ApiError("validation", 400, parsed.error.issues.map((i) => i.message).join("; "));

  const deviceHash = await ensureDeviceHash();
  if (!(await limiters.rsvp.hit(deviceHash)).ok) throw new ApiError("rate_limited", 429);
  const rsvp = await submitRsvp(event.id, deviceHash, parsed.data);
  return NextResponse.json({ id: rsvp.id }, { status: 200 });
});
