import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoverUploader } from "@/components/host/cover-uploader";
import { EventForm } from "@/components/host/event-form";
import { eventFormLabels, settingsLabels } from "@/components/host/labels";
import { SettingsForm } from "@/components/host/settings-form";
import type { Locale } from "@/i18n/routing";
import { utcToKlLocal } from "@/lib/dates";
import { requireEventMember } from "@/server/events/access";
import { updateEventAction, updateSettingsAction } from "@/server/events/actions";
import { MEDIA_URL_TTL_SEC, storage } from "@/server/media/storage";

export default async function EditEventPage({ params }: { params: Promise<{ locale: string; eventId: string }> }) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);
  const { event } = await requireEventMember(locale as Locale, eventId);
  const [t, ts, formLabels, setLabels] = await Promise.all([
    getTranslations("eventForm"),
    getTranslations("eventSettings"),
    eventFormLabels("save"),
    settingsLabels(),
  ]);
  const coverUrl = event.coverKey ? await storage().getDownloadUrl(event.coverKey, { expiresInSec: MEDIA_URL_TTL_SEC }) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <section className="rounded-2xl bg-white/60 p-5">
        <h2 className="mb-4 font-serif text-2xl">{t("editTitle")}</h2>
        <EventForm
          action={updateEventAction.bind(null, locale as Locale, event.id)}
          labels={formLabels}
          defaults={{
            type: event.type,
            title: event.title,
            hostNames: event.hostNames,
            startsAtLocal: utcToKlLocal(event.startsAt),
            venueName: event.venueName ?? "",
            venueAddress: event.venueAddress ?? "",
            googleMapsUrl: event.googleMapsUrl ?? "",
            wazeUrl: event.wazeUrl ?? "",
            welcomeText: event.welcomeText ?? "",
            themeColor: event.themeColor,
          }}
        />
      </section>
      <div className="space-y-6">
        <section className="rounded-2xl bg-white/60 p-5">
          <CoverUploader
            eventId={event.id}
            coverUrl={coverUrl}
            labels={{
              cover: ts("cover"),
              upload: ts("coverUpload"),
              uploading: ts("coverUploading"),
              remove: ts("coverRemove"),
              error: ts("coverError"),
            }}
          />
        </section>
        <section className="rounded-2xl bg-white/60 p-5">
          <h2 className="mb-4 font-serif text-2xl">{ts("title")}</h2>
          <SettingsForm
            action={updateSettingsAction.bind(null, locale as Locale, event.id)}
            labels={setLabels}
            defaults={{ galleryVisibility: event.galleryVisibility, requireApproval: event.requireApproval, hasPin: Boolean(event.pinHash) }}
          />
        </section>
      </div>
    </div>
  );
}
