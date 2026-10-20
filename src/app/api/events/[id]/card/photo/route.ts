import { NextResponse } from "next/server";
import { requireCardEditor } from "@/server/ecard/access";
import { addCardPhoto, removeCardPhoto } from "@/server/ecard/service";
import { ApiError, handle } from "@/server/http";

export const runtime = "nodejs";

/** POST multipart `file` — add a card photo (up to 3). */
export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireCardEditor(id);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError("validation", 400, "file is required");
  const key = await addCardPhoto(event.id, file);
  return NextResponse.json({ key }, { status: 201 });
});

/** DELETE ?key= — remove one card photo. */
export const DELETE = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireCardEditor(id);
  const key = new URL(request.url).searchParams.get("key");
  if (!key) throw new ApiError("validation", 400, "key is required");
  await removeCardPhoto(event.id, key);
  return NextResponse.json({ ok: true });
});
