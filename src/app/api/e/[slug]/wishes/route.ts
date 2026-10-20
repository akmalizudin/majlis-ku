import { NextResponse } from "next/server";
import { requireGuest } from "@/server/guests/require-guest";
import { ApiError, handle, readJson } from "@/server/http";
import { limiters } from "@/server/security/rate-limit";
import { publishWish } from "@/server/uploads/processing";
import { createWish, wishSchema } from "@/server/wishes/service";

export const POST = handle(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const { message } = await readJson(request, wishSchema);
  const { event, guest, deviceHash } = await requireGuest(slug);
  if (!event.plan.includesGallery) throw new ApiError("gallery_not_in_plan", 403);
  if (!limiters.wish.hit(deviceHash).ok) throw new ApiError("rate_limited", 429);
  const wish = await createWish({ event, guest, message });
  await publishWish(wish.id);
  return NextResponse.json({ wishId: wish.id }, { status: 201 });
});