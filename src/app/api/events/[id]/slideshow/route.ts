import { NextResponse } from "next/server";
import { requireEventMemberApi } from "@/server/events/access";
import { handle } from "@/server/http";
import { slideshowItems } from "@/server/slideshow/service";

export const runtime = "nodejs";

/** Fresh slideshow items with new signed URLs; the slideshow calls this every 20 minutes. */
export const GET = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  return NextResponse.json({ items: await slideshowItems(event.id) }, { headers: { "Cache-Control": "no-store" } });
});
