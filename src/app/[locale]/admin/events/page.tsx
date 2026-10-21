import { getTranslations, setRequestLocale } from "next-intl/server";
import { Forbidden } from "@/components/admin/forbidden";
import { Pager } from "@/components/admin/pager";
import { eventsQuery, type RawQuery } from "@/components/admin/query";
import { buttonClass, inputClass, linkClass, tableWrapClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEventDay, type AppLocale } from "@/lib/dates";
import { formatBytes } from "@/lib/format";
import { listAdminEvents } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

const STATUSES = ["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
const PLANS = ["FREE", "ECARD", "PREMIUM"] as const;

export default async function AdminEventsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<RawQuery> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const { q, status, plan, page } = eventsQuery.parse(await searchParams);
  const [t, { rows, total }] = await Promise.all([getTranslations("admin"), listAdminEvents({ q: q || undefined, status, plan, page })]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl">{t("nav.events")}</h1>
        <p className="text-sm text-ink/60">{t("events.total", { count: total })}</p>
      </div>
      <form method="get" className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-sm font-medium">{t("events.searchLabel")}</span>
          <input name="q" type="search" defaultValue={q} maxLength={100} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("filter.status")}</span>
          <select name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">{t("filter.allStatuses")}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`eventStatus.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("filter.plan")}</span>
          <select name="plan" defaultValue={plan ?? ""} className={inputClass}>
            <option value="">{t("filter.allPlans")}</option>
            {PLANS.map((value) => (
              <option key={value} value={value}>
                {t(`planCode.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass}>
          {t("filter.apply")}
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-ink/60">{t("empty")}</p>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/60">
              <tr>
                <th className="p-3 font-medium">{t("col.title")}</th>
                <th className="p-3 font-medium">{t("col.slug")}</th>
                <th className="p-3 font-medium">{t("col.owner")}</th>
                <th className="p-3 font-medium">{t("col.plan")}</th>
                <th className="p-3 font-medium">{t("col.status")}</th>
                <th className="p-3 font-medium">{t("col.date")}</th>
                <th className="p-3 font-medium">{t("col.uploads")}</th>
                <th className="p-3 font-medium">{t("col.storage")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id} className="border-b border-ink/5 last:border-0">
                  <td className="p-3 font-medium">
                    <Link href={`/admin/events/${event.id}`} className={linkClass}>
                      {event.title}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs">{event.slug}</td>
                  <td className="p-3">{event.members[0]?.user.email ?? "—"}</td>
                  <td className="p-3">{locale === "ms" ? event.plan.nameMs : event.plan.nameEn}</td>
                  <td className="p-3">{t(`eventStatus.${event.status}`)}</td>
                  <td className="p-3 whitespace-nowrap">{formatEventDay(event.startsAt, locale as AppLocale)}</td>
                  <td className="p-3 tabular-nums">{event.uploadCount}</td>
                  <td className="p-3 whitespace-nowrap tabular-nums">{formatBytes(event.storageBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/events" params={{ q, status, plan }} page={page} total={total} />
    </div>
  );
}
