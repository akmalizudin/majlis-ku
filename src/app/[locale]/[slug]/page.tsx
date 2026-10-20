import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { LocaleToggle } from "@/components/locale-toggle";
import type { Locale } from "@/i18n/routing";
import { formatEventDate } from "@/lib/dates";
import { db } from "@/server/db";

const getEvent = cache((slug: string) =>
  db.event.findUnique({
    where: { slug },
    select: { title: true, hostNames: true, startsAt: true, venueName: true, welcomeText: true, themeColor: true, status: true },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  return event ? { title: event.hostNames, robots: { index: false } } : {};
}

export default async function GuestEventPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const event = await getEvent(slug);
  if (!event || event.status === "DRAFT") notFound();
  const [t, tc] = await Promise.all([getTranslations("event"), getTranslations("common")]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10">
      <div className="flex justify-end py-3">
        <LocaleToggle locale={locale as Locale} label={tc("switchTo")} />
      </div>
      <section className="rounded-3xl p-8 text-center text-white" style={{ backgroundColor: event.themeColor }}>
        <p className="text-sm uppercase tracking-widest opacity-80">{t("welcome")}</p>
        <h1 className="mt-3 font-serif text-4xl">{event.hostNames}</h1>
        <p className="mt-2 opacity-90">{event.title}</p>
        <p className="mt-4 text-sm opacity-90">{formatEventDate(event.startsAt, locale as Locale)}</p>
        {event.venueName ? <p className="text-sm opacity-90">{event.venueName}</p> : null}
      </section>
      {event.welcomeText ? <p className="mt-6 text-center text-lg">{event.welcomeText}</p> : null}
    </main>
  );
}
