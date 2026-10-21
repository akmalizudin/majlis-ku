import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { CardView } from "@/components/card/card-view";
import { Countdown } from "@/components/card/countdown";
import { MusicButton } from "@/components/card/music-button";
import { RsvpForm } from "@/components/card/rsvp-form";
import { LocaleToggle } from "@/components/locale-toggle";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEventDate, formatEventDay } from "@/lib/dates";
import { findPublicCard, signedCardMedia } from "@/server/ecard/service";
import { readGuestContext } from "@/server/guests/context";
import { rsvpOpen } from "@/server/rsvp/rules";
import { findMyRsvp } from "@/server/rsvp/service";

const getCard = cache((slug: string) => findPublicCard(slug));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await getCard(slug);
  if (!found) return {};
  const { event, card } = found;
  const names = card.content.names || event.hostNames;
  const title = `${card.content.headline || event.title} · ${names}`;
  const description = [formatEventDate(event.startsAt, locale as Locale), event.venueName].filter(Boolean).join(" · ");
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { type: "website", title, description, locale: locale === "ms" ? "ms_MY" : "en_MY", siteName: "Majlis Ku" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** The public invitation card at /i/{slug}. */
export default async function CardPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const found = await getCard(slug);
  if (!found) notFound();
  const { event, card } = found;
  const [t, tr, tc, messages, media, guest, treport] = await Promise.all([
    getTranslations("card"),
    getTranslations("rsvp"),
    getTranslations("common"),
    getMessages(),
    signedCardMedia(card),
    readGuestContext(slug),
    getTranslations("report"),
  ]);
  const existing = await findMyRsvp(event.id, guest?.deviceHash ?? null);
  const open = rsvpOpen(card.content);
  const { style, content } = card;

  return (
    <main className="min-h-dvh px-3 pb-24" style={{ backgroundColor: `${style.background}` }}>
      <div className="mx-auto flex max-w-md justify-end py-3">
        <LocaleToggle locale={locale as Locale} label={tc("switchTo")} />
      </div>
      <CardView
        style={style}
        event={event}
        content={content}
        photos={media.photos}
        locale={locale as Locale}
        labels={{
          invite: t("invite"),
          when: t("when"),
          where: t("where"),
          googleMaps: t("googleMaps"),
          waze: t("waze"),
          calendar: t("calendar"),
          schedule: t("schedule"),
          contacts: t("contacts"),
          guestbook: t("guestbook"),
        }}
        icsHref={`/api/e/${slug}/ics`}
        guestbookHref={content.showGuestbook && event.plan.includesGallery ? getPathname({ href: `/${slug}`, locale: locale as Locale }) : null}
        countdown={
          <Countdown
            target={event.startsAt.toISOString()}
            color={style.primary}
            labels={{
              days: t("countdownDays"),
              hours: t("countdownHours"),
              minutes: t("countdownMinutes"),
              seconds: t("countdownSeconds"),
              started: t("started"),
            }}
          />
        }
        rsvp={
          content.rsvpEnabled ? (
            <>
              <h2 className="mb-1 text-center font-serif text-2xl" style={{ color: style.primary }}>
                {tr("title")}
              </h2>
              {content.rsvpDeadline && open ? (
                <p className="mb-3 text-center text-sm opacity-70">
                  {tr("deadline", { date: formatEventDay(new Date(`${content.rsvpDeadline}T12:00:00+08:00`), locale as Locale) })}
                </p>
              ) : null}
              {open ? (
                <NextIntlClientProvider messages={{ rsvp: messages.rsvp }}>
                  <RsvpForm
                    slug={slug}
                    maxPax={content.maxPax}
                    askPhone={content.askPhone}
                    color={style.primary}
                    existing={
                      existing
                        ? { name: existing.name, attending: existing.attending, pax: existing.pax || 1, phone: existing.phone, message: existing.message }
                        : null
                    }
                  />
                </NextIntlClientProvider>
              ) : (
                <p className="text-center">{tr("closed")}</p>
              )}
            </>
          ) : null
        }
      />
      <p className="mx-auto mt-6 max-w-md text-center">
        <Link href={`/${slug}/report`} className="inline-flex min-h-11 items-center text-sm underline" style={{ color: style.primary }}>
          {treport("link")}
        </Link>
      </p>
      {media.music ? <MusicButton src={media.music} color={style.primary} labels={{ play: t("playMusic"), pause: t("pauseMusic") }} /> : null}
    </main>
  );
}
