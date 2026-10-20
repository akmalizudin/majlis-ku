import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { EventNav } from "@/components/host/event-nav";
import { SiteHeader } from "@/components/site-header";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEventDate } from "@/lib/dates";
import { requireEventMember } from "@/server/events/access";

export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);
  const { event } = await requireEventMember(locale as Locale, eventId);
  const [t, tc] = await Promise.all([getTranslations("eventNav"), getTranslations("common")]);
  const base = `/dashboard/events/${event.id}`;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-ink/70 underline">
          ← {tc("dashboard")}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: event.themeColor }} />
          <div>
            <h1 className="font-serif text-3xl leading-tight">{event.hostNames}</h1>
            <p className="text-sm text-ink/60">
              {event.title} · {formatEventDate(event.startsAt, locale as Locale)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <EventNav
            links={[
              { href: base, label: t("overview") },
              { href: `${base}/gallery`, label: t("gallery") },
              { href: `${base}/edit`, label: t("edit") },
              { href: getPathname({ href: `/${event.slug}`, locale: locale as Locale }), label: t("guestPage"), external: true },
            ]}
          />
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </>
  );
}
