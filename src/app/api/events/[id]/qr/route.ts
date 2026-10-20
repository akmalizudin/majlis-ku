import { requireEventMemberApi, eventUrl } from "@/server/events/access";
import { handle } from "@/server/http";
import { qrPng, qrSvg } from "@/server/qr/qr";

export const runtime = "nodejs";

/** GET ?format=png|svg[&download=1] — the event's QR code, for its hosts. */
export const GET = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  const search = new URL(request.url).searchParams;
  const format = search.get("format") === "svg" ? "svg" : "png";
  const download = search.get("download") === "1";
  const url = eventUrl(event.slug);
  const headers: Record<string, string> = { "Cache-Control": "private, max-age=300" };
  if (download) headers["Content-Disposition"] = `attachment; filename="qr-${event.slug}.${format}"`;

  if (format === "svg") {
    return new Response(await qrSvg(url), { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  return new Response(new Uint8Array(await qrPng(url, 1024)), { headers: { ...headers, "Content-Type": "image/png" } });
});
