import { getTranslations, setRequestLocale } from "next-intl/server";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { GalleryToolbar, nextPageHref } from "@/components/gallery/gallery-toolbar";
import { LiveItems } from "@/components/gallery/live-items";
import { galleryLabels } from "@/components/host/labels";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireEventMember } from "@/server/events/access";
import { GALLERY_FILTERS, galleryQuerySchema, listGallery } from "@/server/gallery/service";

export default async function HostGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; eventId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);
  const { event } = await requireEventMember(locale as Locale, eventId);
  const query = galleryQuerySchema.parse(await searchParams);
  const [t, labels, page] = await Promise.all([getTranslations("gallery"), galleryLabels(), listGallery(event.id, query, "host")]);
  const base = `/dashboard/events/${event.id}/gallery`;

  return (
    <div className="space-y-4">
      <GalleryToolbar
        base={base}
        formAction={getPathname({ href: base, locale: locale as Locale })}
        query={query}
        labels={labels}
        filters={GALLERY_FILTERS}
      />
      {!query.after && query.sort === "newest" ? (
        <LiveItems
          streamUrl={`/api/events/${event.id}/stream`}
          filter={query.filter}
          q={query.q}
          labels={labels}
          liveLabel={t("live")}
          newLabel={t("newWord")}
          showStatus
        />
      ) : null}
      <GalleryGrid items={page.items} labels={labels} showStatus />
      {page.nextCursor ? (
        <div className="text-center">
          <Link href={nextPageHref(base, query, page.nextCursor)} className="inline-flex min-h-11 items-center rounded-full bg-white px-6 font-medium shadow-sm">
            {t("loadMore")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
