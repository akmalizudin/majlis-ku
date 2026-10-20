import { formatEventDate } from "@/lib/dates";
import { eventUrl, requireEventMemberApi } from "@/server/events/access";
import { handle } from "@/server/http";
import { standPdf } from "@/server/qr/qr";

export const runtime = "nodejs";

/** GET ?size=a5|a4 — a printable table stand with the QR code. */
export const GET = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { event } = await requireEventMemberApi(id);
  const size = new URL(request.url).searchParams.get("size") === "a4" ? "A4" : "A5";
  const pdf = await standPdf({
    url: eventUrl(event.slug),
    size,
    hostNames: event.hostNames,
    title: event.title,
    dateText: formatEventDate(event.startsAt, event.defaultLocale),
    themeColor: event.themeColor,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qr-stand-${event.slug}-${size.toLowerCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});