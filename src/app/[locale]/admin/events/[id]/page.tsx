import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminDeleteEventForm, ChangePlanForm, ReportActions, SuspendButton } from "@/components/admin/event-actions";
import { Forbidden } from "@/components/admin/forbidden";
import { eventActionLabels } from "@/components/admin/labels";
import { cardClass, ghostButtonClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEventDay, utcToKlLocal, type AppLocale } from "@/lib/dates";
import { formatBytes } from "@/lib/format";
import { getAdminEvent, listPlans } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

export default async function AdminEventPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const [t, event, plans, labels] = await Promise.all([getTranslations("admin"), getAdminEvent(id), listPlans(), eventActionLabels()]);
  if (!event) notFound();
  const suspended = event.status === "SUSPENDED";
  const canChangePlan = event.status === "ACTIVE" || suspended;
  const day = (date: Date) => formatEventDay(date, locale as AppLocale);
  const field = (label: string, value: string) => (
    <div>
      <dt className="text-sm text-ink/60">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
  const owner = event.members.find((member) => member.role === "OWNER");
  return (
    <div className="space-y-6">
      <Link href="/admin/events" className="inline-flex min-h-11 items-center text-sm text-ink/70 underline">
        ← {t("event.back")}
      </Link>
      <div>
        <h1 className="font-serif text-3xl">{event.title}</h1>
        <p className="text-ink/70">{event.hostNames}</p>
      </div>
      {suspended ? <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t("event.suspendedNote")}</p> : null}
      <section className={cardClass}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field(t("col.slug"), event.slug)}
          {field(t("col.owner"), owner?.user.email ?? "—")}
          {field(t("col.plan"), locale === "ms" ? event.plan.nameMs : event.plan.nameEn)}
          {field(t("col.status"), t(`eventStatus.${event.status}`))}
          {field(t("col.date"), day(event.startsAt))}
          {field(t("event.purgeAt"), event.purgeAt ? day(event.purgeAt) : "—")}
          {event.suspendedAt ? field(t("event.suspendedAt"), utcToKlLocal(event.suspendedAt).replace("T", " ")) : null}
          {field(t("col.uploads"), String(event.uploadCount))}
          {field(t("col.storage"), formatBytes(event.storageBytes))}
        </dl>
        <h2 className="mt-5 text-sm text-ink/60">{t("event.members")}</h2>
        <ul className="text-sm">
          {event.members.map((member) => (
            <li key={member.user.email} className="min-h-6">
              {member.user.email} · {t(`memberRole.${member.role}`)}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/dashboard/events/${event.id}`} className={ghostButtonClass}>
            {t("event.hostDashboard")}
          </Link>
          <Link href={`/${event.slug}`} className={ghostButtonClass}>
            {t("event.guestPage")}
          </Link>
        </div>
      </section>
      <section className={cardClass}>
        <h2 className="font-serif text-2xl">{t("event.openReports")}</h2>
        {event.reports.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60">{t("event.noReports")}</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {event.reports.map((report) => (
              <li key={report.id} className="space-y-2 border-b border-ink/5 pb-4 last:border-0">
                <p className="font-medium">
                  {t(`reportReason.${report.reason}`)} <span className="text-sm font-normal text-ink/60">· {utcToKlLocal(report.createdAt).replace("T", " ")}</span>
                </p>
                {report.details ? <p className="whitespace-pre-line break-words text-sm">{report.details}</p> : null}
                <ReportActions
                  reportId={report.id}
                  labels={labels}
                  resolveName={t("reports.resolveFor", { reason: t(`reportReason.${report.reason}`), slug: event.slug })}
                  dismissName={t("reports.dismissFor", { reason: t(`reportReason.${report.reason}`), slug: event.slug })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      {canChangePlan ? (
        <section className={cardClass}>
          <h2 className="font-serif text-2xl">{suspended ? t("event.unsuspend") : t("event.suspend")}</h2>
          <div className="mt-2">
            <SuspendButton eventId={event.id} suspended={suspended} labels={labels} />
          </div>
        </section>
      ) : null}
      {canChangePlan ? (
        <section className={cardClass}>
          <ChangePlanForm
            eventId={event.id}
            currentCode={event.plan.code}
            plans={plans.filter((plan) => plan.active || plan.code === event.plan.code).map((plan) => ({ code: plan.code, label: locale === "ms" ? plan.nameMs : plan.nameEn }))}
            labels={labels}
          />
        </section>
      ) : null}
      <AdminDeleteEventForm eventId={event.id} slug={event.slug} locale={locale as Locale} labels={labels} />
    </div>
  );
}
