import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Slideshow } from "@/components/slideshow/slideshow";
import type { Locale } from "@/i18n/routing";
import { eventUrl, requireEventMember } from "@/server/events/access";
import { slideshowItems } from "@/server/slideshow/service";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Full-screen venue display. Hosts open it on the laptop connected to the TV or projector. */
export default async function SlideshowPage({ params }: { params: Promise<{ locale: string; eventId: string }> }) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);
  const { event } = await requireEventMember(locale as Locale, eventId);
  const [t, items] = await Promise.all([getTranslations("slideshow"), slideshowItems(event.id)]);
  return (
    <Slideshow
      eventId={event.id}
      hostNames={event.hostNames}
      themeColor={event.themeColor}
      initialItems={items}
      qrSrc={`/api/events/${event.id}/qr?format=svg`}
      shareUrl={eventUrl(event.slug)}
      labels={{ scan: t("scan"), empty: t("empty"), fullscreen: t("fullscreen"), by: t("by", { name: "{name}" }) }}
    />
  );
}