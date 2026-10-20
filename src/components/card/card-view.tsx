/* eslint-disable @next/next/no-img-element -- signed, short-lived media URLs */
import type { ReactNode } from "react";
import { formatEventDate, type AppLocale } from "@/lib/dates";
import { whatsappLink, type CardContent } from "@/lib/schemas/card";
import type { TemplateStyle } from "@/server/ecard/templates";

export type CardLabels = Record<
  "invite" | "when" | "where" | "googleMaps" | "waze" | "calendar" | "schedule" | "contacts" | "guestbook",
  string
>;

type CardEvent = {
  hostNames: string;
  startsAt: Date;
  venueName: string | null;
  venueAddress: string | null;
  googleMapsUrl: string | null;
  wazeUrl: string | null;
};

/** A small songket-like diamond row for the classic layout. */
function Songket({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 12" className="mx-auto h-3 w-40" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={`M${i * 12 + 6} 0 L${i * 12 + 12} 6 L${i * 12 + 6} 12 L${i * 12} 6 Z`} fill={color} opacity={i % 2 ? 0.55 : 1} />
      ))}
    </svg>
  );
}

/** Soft petals for the floral layout. */
function Petals({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 200 60" className={`h-14 w-full ${flip ? "rotate-180" : ""}`} aria-hidden>
      {[20, 60, 100, 140, 180].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i % 2 ? 34 : 26})`} opacity={0.75}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse key={angle} rx="7" ry="14" fill={color} transform={`rotate(${angle}) translate(0 -10)`} opacity={0.5} />
          ))}
          <circle r="4" fill={color} />
        </g>
      ))}
    </svg>
  );
}

export function CardView({
  style,
  event,
  content,
  photos,
  locale,
  labels,
  icsHref,
  guestbookHref,
  countdown,
  rsvp,
}: {
  style: TemplateStyle;
  event: CardEvent;
  content: CardContent;
  photos: string[];
  locale: AppLocale;
  labels: CardLabels;
  icsHref: string;
  guestbookHref: string | null;
  countdown: ReactNode;
  rsvp: ReactNode;
}) {
  const serif = style.font === "serif" ? "font-serif" : "font-sans";
  const names = content.names || event.hostNames;
  const button = "inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium";
  const frame =
    style.layout === "classic"
      ? "border-[6px] border-double"
      : style.layout === "modern"
        ? "border-t-8"
        : "border";

  return (
    <article
      className={`mx-auto max-w-md overflow-hidden rounded-[2rem] shadow-sm ${frame}`}
      style={{ backgroundColor: style.background, borderColor: style.accent, color: "#2b2118" }}
      data-layout={style.layout}
    >
      {style.layout === "floral" ? <Petals color={style.accent} /> : null}
      {photos[0] ? <img src={photos[0]} alt="" className="aspect-[4/3] w-full object-cover" /> : null}

      <header className="px-6 pt-8 text-center">
        {style.layout === "classic" ? <Songket color={style.accent} /> : null}
        <p className="mt-4 text-xs tracking-[0.3em] uppercase" style={{ color: style.accent }}>
          {content.headline || labels.invite}
        </p>
        {content.intro ? <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed opacity-80">{content.intro}</p> : null}
        {content.hostLine ? <p className="mt-4 text-sm font-medium">{content.hostLine}</p> : null}
        <h1 className={`mt-4 text-4xl leading-tight ${serif} ${style.layout === "modern" ? "font-bold tracking-tight" : ""}`} style={{ color: style.primary }}>
          {names}
        </h1>
        {style.layout === "classic" ? (
          <div className="mt-4">
            <Songket color={style.accent} />
          </div>
        ) : null}
      </header>

      <section className="space-y-4 px-6 py-6 text-center">
        <div>
          <p className="text-xs tracking-widest uppercase opacity-60">{labels.when}</p>
          <p className="mt-1 text-lg font-medium">{formatEventDate(event.startsAt, locale)}</p>
        </div>
        {event.venueName || event.venueAddress ? (
          <div>
            <p className="text-xs tracking-widest uppercase opacity-60">{labels.where}</p>
            {event.venueName ? <p className="mt-1 text-lg font-medium">{event.venueName}</p> : null}
            {event.venueAddress ? <p className="text-sm opacity-80">{event.venueAddress}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          {event.googleMapsUrl ? (
            <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" className={button} style={{ borderColor: style.primary, color: style.primary }}>
              📍 {labels.googleMaps}
            </a>
          ) : null}
          {event.wazeUrl ? (
            <a href={event.wazeUrl} target="_blank" rel="noreferrer" className={button} style={{ borderColor: style.primary, color: style.primary }}>
              🚗 {labels.waze}
            </a>
          ) : null}
          <a href={icsHref} className={button} style={{ borderColor: style.primary, color: style.primary }}>
            📅 {labels.calendar}
          </a>
        </div>
        {countdown}
      </section>

      {content.schedule.length > 0 ? (
        <section className="px-6 pb-6">
          <h2 className={`text-center text-2xl ${serif}`} style={{ color: style.primary }}>
            {labels.schedule}
          </h2>
          <ul className="mt-3 space-y-2">
            {content.schedule.map((row, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-white/60 px-4 py-2">
                <span className="w-14 shrink-0 font-semibold tabular-nums" style={{ color: style.accent }}>
                  {row.time}
                </span>
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {photos.length > 1 ? (
        <section className="grid grid-cols-2 gap-2 px-6 pb-6">
          {photos.slice(1).map((src) => (
            <img key={src} src={src} alt="" loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />
          ))}
        </section>
      ) : null}

      {content.note ? <p className="px-6 pb-6 text-center text-sm whitespace-pre-line opacity-80">{content.note}</p> : null}

      {rsvp ? (
        <section className="mx-4 mb-6 rounded-3xl bg-white/80 p-5" id="rsvp">
          {rsvp}
        </section>
      ) : null}

      {content.contacts.length > 0 ? (
        <section className="px-6 pb-6 text-center">
          <p className="text-xs tracking-widest uppercase opacity-60">{labels.contacts}</p>
          <ul className="mt-2 space-y-1">
            {content.contacts.map((c, i) => (
              <li key={i}>
                <a href={whatsappLink(c.phone)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium underline">
                  {c.name} · {c.phone}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {guestbookHref ? (
        <div className="px-6 pb-8 text-center">
          <a href={guestbookHref} className="inline-flex min-h-12 items-center rounded-full px-6 font-medium text-white" style={{ backgroundColor: style.primary }}>
            📷 {labels.guestbook}
          </a>
        </div>
      ) : null}
      {style.layout === "floral" ? <Petals color={style.accent} flip /> : null}
    </article>
  );
}