import { NextResponse } from "next/server";
import { requireGuest } from "@/server/guests/require-guest";
import { handle } from "@/server/http";
import { completeUpload } from "@/server/uploads/service";

/** Step 3 of an upload (after the PUT): verify the file and add it to the gallery. */
export const POST = handle(async (_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await params;
  const { event, guest } = await requireGuest(slug);
  const result = await completeUpload({ eventId: event.id, uploadId: id, guestId: guest.id });
  return NextResponse.json(result);
});