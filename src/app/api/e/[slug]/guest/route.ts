import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { ensureDeviceHash, readGuestContext } from "@/server/guests/context";
import { displayNameSchema } from "@/server/guests/identity";
import { ApiError, clientIpHash, handle, readJson } from "@/server/http";
import { limiters } from "@/server/security/rate-limit";

const bodySchema = z.object({ displayName: displayNameSchema });

/** A guest types their name once; this ties it to their device for this event. */
export const POST = handle(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const { displayName } = await readJson(request, bodySchema);
  if (!(await limiters.guestJoin.hit(await clientIpHash())).ok) throw new ApiError("rate_limited", 429);

  const deviceHash = await ensureDeviceHash();
  const context = await readGuestContext(slug);
  if (!context) throw new ApiError("not_found", 404);
  const pinOk = context.pinOk || !context.event.pinHash;
  if (!pinOk) throw new ApiError("pin_required", 403);

  const guest = await db.guest.upsert({
    where: { eventId_deviceTokenHash: { eventId: context.event.id, deviceTokenHash: deviceHash } },
    update: { displayName },
    create: { eventId: context.event.id, deviceTokenHash: deviceHash, displayName },
  });
  return NextResponse.json({ guestId: guest.id, displayName: guest.displayName });
});