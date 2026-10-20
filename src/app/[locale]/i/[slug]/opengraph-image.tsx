import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import type { Locale } from "@/i18n/routing";
import { formatEventDate } from "@/lib/dates";
import { findPublicCard } from "@/server/ecard/service";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Majlis Ku";

/** The WhatsApp / Facebook link preview: names and date only, never guests' photos. */
export default async function OgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const found = await findPublicCard(slug);
  if (!found) notFound();
  const { event, card } = found;
  const { style, content } = card;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: style.background,
          border: `24px solid ${style.accent}`,
          color: "#2b2118",
          padding: 60,
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 8, textTransform: "uppercase", color: style.accent }}>{content.headline || event.title}</div>
        <div style={{ fontSize: 96, marginTop: 24, color: style.primary, textAlign: "center", lineHeight: 1.1 }}>{content.names || event.hostNames}</div>
        <div style={{ fontSize: 36, marginTop: 32 }}>{formatEventDate(event.startsAt, (locale === "en" ? "en" : "ms") as Locale)}</div>
        {event.venueName ? <div style={{ fontSize: 30, marginTop: 12, opacity: 0.8 }}>{event.venueName}</div> : null}
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
