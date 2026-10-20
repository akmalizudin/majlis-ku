import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGuest } from "@/server/guests/require-guest";
import { ApiError, handle, readJson } from "@/server/http";
import { limiters } from "@/server/security/rate-limit";
import { startUpload } from "@/server/uploads/service";

const bodySchema = z.object({
  kind: z.enum(["PHOTO", "VIDEO", "VOICE"]),
  mimeType: z.string().trim().min(3).max(100),
  sizeBytes: z.number().int().positive(),
  durationSec: z.number().int().nonnegative().max(3600).nullable().optional(),
});

/** Step 1 of an upload: check the plan and get a short-lived upload URL. */
export const POST = handle(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const body = await readJson(request, bodySchema);
  const { event, guest, deviceHash } = await requireGuest(slug);
  if (!limiters.uploadStart.hit(deviceHash).ok) throw new ApiError("rate_limited", 429);
  const target = await startUpload({ event, guest, ...body });
  return NextResponse.json(target, { status: 201 });
});