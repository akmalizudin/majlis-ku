import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEventMemberApi } from "@/server/events/access";
import { ApiError, handle } from "@/server/http";
import { detectMime, isAllowedMime } from "@/server/media/file-check";
import { processCover } from "@/server/media/images";
import { coverKey } from "@/server/media/keys";
import { storage } from "@/server/media/storage";
import { canEditEvent } from "@/server/moderation/rules";
import { KIND_MAX_BYTES } from "@/server/plans/limits";

export const runtime = "nodejs";

/** POST multipart `file` — replace the event's cover photo (hosts only). */
export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  if (!canEditEvent(event.memberRole)) throw new ApiError("forbidden", 403);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError("validation", 400, "file is required");
  if (file.size === 0 || file.size > Number(KIND_MAX_BYTES.PHOTO)) throw new ApiError("too_large", 413);

  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = await detectMime(bytes.subarray(0, 4100));
  if (!detected || !isAllowedMime("PHOTO", detected)) throw new ApiError("invalid_type", 415);

  let cover: Buffer;
  try {
    cover = await processCover(bytes);
  } catch {
    throw new ApiError("invalid_file", 422);
  }
  const key = coverKey(event.id, randomBytes(8).toString("hex"));
  await storage().putObject(key, cover, "image/jpeg");
  if (event.coverKey) await storage().deleteObject(event.coverKey);
  await db.event.update({ where: { id: event.id }, data: { coverKey: key } });
  return NextResponse.json({ ok: true });
});

/** DELETE — remove the cover photo. */
export const DELETE = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  if (!canEditEvent(event.memberRole)) throw new ApiError("forbidden", 403);
  if (event.coverKey) await storage().deleteObject(event.coverKey);
  await db.event.update({ where: { id: event.id }, data: { coverKey: null } });
  return NextResponse.json({ ok: true });
});
