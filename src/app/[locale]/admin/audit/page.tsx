import { getTranslations, setRequestLocale } from "next-intl/server";
import { Forbidden } from "@/components/admin/forbidden";
import { Pager } from "@/components/admin/pager";
import { pageQuery, type RawQuery } from "@/components/admin/query";
import { tableWrapClass } from "@/components/admin/ui";
import type { Locale } from "@/i18n/routing";
import { utcToKlLocal } from "@/lib/dates";
import { listAudit } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** One readable line from AuditLog.details (ids, slugs, codes and plan fields only, see writeAudit). */
function summarize(action: string, details: unknown, t: T): string {
  const d = (typeof details === "object" && details !== null ? details : {}) as Record<string, unknown>;
  const str = (key: string) => (typeof d[key] === "string" ? (d[key] as string) : "");
  switch (action) {
    case "EVENT_PLAN_CHANGED":
      return `${str("slug")}: ${str("from")} → ${str("to")}`;
    case "REPORT_RESOLVED":
    case "REPORT_DISMISSED":
      return `${str("eventSlug")} (${str("reason") ? t(`reportReason.${str("reason")}`) : ""})`;
    case "PLAN_UPDATED": {
      const fields = Object.keys((d.changes as object | undefined) ?? {}).map((key) => t(`plans.${key === "priceSen" ? "price" : key}`));
      return `${str("code")}, ${t("audit.changed", { fields: fields.join(", ") })}`;
    }
    case "TEMPLATE_CREATED":
    case "TEMPLATE_UPDATED":
      return str("code");
    default:
      return str("slug");
  }
}

export default async function AdminAuditPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<RawQuery> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const { page } = pageQuery.parse(await searchParams);
  const [t, { rows, total }] = await Promise.all([getTranslations("admin"), listAudit({ page })]);
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">{t("nav.audit")}</h1>
      <p className="text-sm text-ink/60">{t("audit.note")}</p>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-ink/60">{t("empty")}</p>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/60">
              <tr>
                <th className="p-3 font-medium">{t("col.time")}</th>
                <th className="p-3 font-medium">{t("col.actor")}</th>
                <th className="p-3 font-medium">{t("col.action")}</th>
                <th className="p-3 font-medium">{t("col.target")}</th>
                <th className="p-3 font-medium">{t("col.summary")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink/5 align-top last:border-0">
                  <td className="p-3 whitespace-nowrap text-ink/60">{utcToKlLocal(row.createdAt).replace("T", " ")}</td>
                  <td className="p-3 break-all">{row.actor?.email ?? "—"}</td>
                  <td className="p-3 font-medium">{t(`auditAction.${row.action}`)}</td>
                  <td className="p-3">{t(`targetType.${row.targetType}`)}</td>
                  <td className="p-3 break-words">{summarize(row.action, row.details, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/audit" page={page} total={total} />
    </div>
  );
}
