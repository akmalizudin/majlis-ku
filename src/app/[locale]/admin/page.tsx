import { getTranslations, setRequestLocale } from "next-intl/server";
import { Forbidden } from "@/components/admin/forbidden";
import { cardClass, linkClass, tableWrapClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatBytes } from "@/lib/format";
import { adminOverview } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const [t, data] = await Promise.all([getTranslations("admin"), adminOverview()]);
  const stat = (label: string, value: string | number, note?: string) => (
    <div className={cardClass}>
      <p className="text-sm text-ink/60">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
      {note ? <p className="text-xs text-ink/60">{note}</p> : null}
    </div>
  );
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">{t("nav.overview")}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stat(t("overview.users"), data.users)}
        <Link href="/admin/reports" className="block">
          {stat(t("overview.openReports"), data.openReports)}
        </Link>
        {stat(t("overview.storage"), formatBytes(data.storageBytes), t("overview.storageNote"))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className={cardClass}>
          <h2 className="font-serif text-xl">{t("overview.byStatus")}</h2>
          <ul className="mt-2 divide-y divide-ink/5">
            {data.eventsByStatus.map((row) => (
              <li key={row.status} className="flex min-h-11 items-center justify-between">
                <span>{t(`eventStatus.${row.status}`)}</span>
                <span className="tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={cardClass}>
          <h2 className="font-serif text-xl">{t("overview.byPlan")}</h2>
          <ul className="mt-2 divide-y divide-ink/5">
            {data.eventsByPlan.map((row) => (
              <li key={row.code} className="flex min-h-11 items-center justify-between">
                <span>{t(`planCode.${row.code}`)}</span>
                <span className="tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section>
        <h2 className="font-serif text-xl">{t("overview.topEvents")}</h2>
        {data.topEvents.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-6 text-center text-ink/60">{t("empty")}</p>
        ) : (
          <div className={`${tableWrapClass} mt-2`}>
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-ink/10 text-ink/60">
                <tr>
                  <th className="p-3 font-medium">{t("col.title")}</th>
                  <th className="p-3 font-medium">{t("col.slug")}</th>
                  <th className="p-3 font-medium">{t("col.storage")}</th>
                </tr>
              </thead>
              <tbody>
                {data.topEvents.map((event) => (
                  <tr key={event.id} className="border-b border-ink/5 last:border-0">
                    <td className="p-3">
                      <Link href={`/admin/events/${event.id}`} className={linkClass}>
                        {event.title}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-xs">{event.slug}</td>
                    <td className="p-3 whitespace-nowrap tabular-nums">{formatBytes(event.storageBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
