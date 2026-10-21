/* eslint-disable @next/next/no-img-element -- the cover uses a signed, short-lived URL */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { GuestActions } from "@/components/guest/guest-actions";
import { SiteFooter } from "@/components/site-footer";
import { LocaleToggle } from "@/components/locale-toggle";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEventDate } from "@/lib/dates";
import { readGuestContext } from "@/server/guests/context";
import { MEDIA_URL_TTL_SEC, storage } from "@/server/media/storage";
import { ENABLED_KINDS } from "@/server/uploads/service";

const getContext = cache((slug: string) => readGuestContext(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const context = await getContext(slug);
  return context ? { title: context.event.hostNames, robots: { index: false, follow: false } } : {};
}

export default async function GuestEventPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const context = await getContext(slug);
  if (!context) notFound();
  const { event, guest, pinOk } = context;
  const [t, tc, messages, tr] = await Promise.all([getTranslations("event"), getTranslations("common"), getMessages(), getTranslations("report")]);
  const coverUrl = event.coverKey && pinOk ? await storage().getDownloadUrl(event.coverKey, { expiresInSec: MEDIA_URL_TTL_SEC }) : null;
  const galleryHref = event.galleryVisibility === "GUESTS" ? getPathname({ href: `/${slug}/gallery`, locale: locale as Locale }) : null;

  return (
    <>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10">
        <div className="flex justify-end py-3">
          <LocaleToggle locale={locale as Locale} label={tc("switchTo")} />
        </div>
        <section className="overflow-hidden rounded-3xl text-center text-white shadow-sm" style={{ backgroundColor: event.themeColor }}>
          {coverUrl ? <img src={coverUrl} alt="" className="aspect-[16/10] w-full object-cover" /> : null}
          <div className="p-8">
            <p className="text-sm tracking-widest uppercase opacity-80">{t("welcome")}</p>
            <h1 className="mt-3 font-serif text-4xl">{event.hostNames}</h1>
            <p className="mt-2 opacity-90">{event.title}</p>
            <p className="mt-4 text-sm opacity-90">{formatEventDate(event.startsAt, locale as Locale)}</p>
            {event.venueName ? <p className="text-sm opacity-90">{event.venueName}</p> : null}
          </div>
        </section>
        {event.welcomeText && pinOk ? <p className="mt-6 text-center text-lg">{event.welcomeText}</p> : null}
        {event.plan.includesGallery ? (
          <NextIntlClientProvider messages={{ guest: messages.guest }}>
            <GuestActions
              slug={slug}
              privacyHref={getPathname({ href: "/privacy", locale: locale as Locale })}
              needsPin={!pinOk}
              initialName={guest?.displayName ?? null}
              galleryHref={pinOk ? galleryHref : null}
              features={{
                video: ENABLED_KINDS.includes("VIDEO") && event.plan.videoAllowed,
                voice: ENABLED_KINDS.includes("VOICE"),
                maxVideoSeconds: event.plan.maxVideoSeconds ?? 60,
              }}
            />
          </NextIntlClientProvider>
        ) : null}
        <p className="mt-8 text-center">
          <Link href={`/${slug}/report`} className="inline-flex min-h-11 items-center text-sm text-ink/60 underline">
            {tr("link")}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
