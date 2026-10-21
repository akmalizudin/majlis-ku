import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportActions } from "@/components/admin/event-actions";
import { Forbidden } from "@/components/admin/forbidden";
import { eventActionLabels } from "@/components/admin/labels";
import { Pager } from "@/components/admin/pager";
import { reportsQuery, type RawQuery } from "@/components/admin/query";
import { linkClass, tableWrapClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { utcToKlLocal } from "@/lib/dates";
import { listReports } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

const FILTERS = ["OPEN", "RESOLVED", "DISMISSED", "ALL"] as const;

export default async function AdminReportsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<RawQuery> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const { status, page } = reportsQuery.parse(await searchParams);
  const [t, { rows, total }, labels] = await Promise.all([getTranslations("admin"), listReports({ status, page }), eventActionLabels()]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl">{t("nav.reports")}</h1>
        <p className="text-sm text-ink/60">{t("reports.total", { count: total })}</p>
      </div>
      <p className="text-sm text-ink/60">{t("reports.note")}</p>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={filter === "OPEN" ? "/admin/reports" : `/admin/reports?status=${filter}`}
            aria-current={status === filter ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm ${status === filter ? "bg-ink text-white" : "bg-white"}`}
          >
            {t(`reports.${filter}`)}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-ink/60">{t("empty")}</p>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/60">
              <tr>
                <th className="p-3 font-medium">{t("col.time")}</th>
                <th className="p-3 font-medium">{t("col.event")}</th>
                <th className="p-3 font-medium">{t("col.reason")}</th>
                <th className="p-3 font-medium">{t("col.details")}</th>
                <th className="p-3 font-medium">{t("col.status")}</th>
                <th className="p-3 font-medium">{t("col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((report) => (
                <tr key={report.id} className="border-b border-ink/5 align-top last:border-0">
                  <td className="p-3 whitespace-nowrap text-ink/60">{utcToKlLocal(report.createdAt).replace("T", " ")}</td>
                  <td className="p-3">
                    <Link href={`/admin/events/${report.event.id}`} className={linkClass}>
                      {report.event.title}
                    </Link>
                    <span className="block font-mono text-xs text-ink/60">{report.event.slug}</span>
                  </td>
                  <td className="p-3">{t(`reportReason.${report.reason}`)}</td>
                  <td className="max-w-xs p-3 break-words whitespace-pre-line">{report.details ?? "—"}</td>
                  <td className="p-3">{t(`reports.${report.status}`)}</td>
                  <td className="p-3">{report.status === "OPEN" ? <ReportActions
                      reportId={report.id}
                      labels={labels}
                      resolveName={t("reports.resolveFor", { reason: t(`reportReason.${report.reason}`), slug: report.event.slug })}
                      dismissName={t("reports.dismissFor", { reason: t(`reportReason.${report.reason}`), slug: report.event.slug })}
                    /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/reports" params={{ status: status === "OPEN" ? undefined : status }} page={page} total={total} />
    </div>
  );
}
