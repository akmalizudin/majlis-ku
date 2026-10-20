import { NextResponse } from "next/server";
import { requireCardEditor } from "@/server/ecard/access";
import { removeCardMusic, setCardMusic } from "@/server/ecard/service";
import { ApiError, handle } from "@/server/http";

export const runtime = "nodejs";

/** POST multipart `file` — set the card's background music (MP3 or M4A). */
export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireCardEditor(id);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError("validation", 400, "file is required");
  await setCardMusic(event.id, file);
  return NextResponse.json({ ok: true }, { status: 201 });
});

/** DELETE — remove the music. */
export const DELETE = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireCardEditor(id);
  await removeCardMusic(event.id);
  return NextResponse.json({ ok: true });
});
