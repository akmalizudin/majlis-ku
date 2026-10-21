import { getTranslations, setRequestLocale } from "next-intl/server";
import { Forbidden } from "@/components/admin/forbidden";
import { Pager } from "@/components/admin/pager";
import { usersQuery, type RawQuery } from "@/components/admin/query";
import { buttonClass, inputClass, linkClass, tableWrapClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEventDay, type AppLocale } from "@/lib/dates";
import { listAdminUsers } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

export default async function AdminUsersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<RawQuery> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const { q, page } = usersQuery.parse(await searchParams);
  const [t, { rows, total }] = await Promise.all([getTranslations("admin"), listAdminUsers({ q: q || undefined, page })]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl">{t("nav.users")}</h1>
        <p className="text-sm text-ink/60">{t("users.total", { count: total })}</p>
      </div>
      <form method="get" className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-sm font-medium">{t("users.searchLabel")}</span>
          <input name="q" type="search" defaultValue={q} maxLength={100} className={inputClass} />
        </label>
        <button type="submit" className={buttonClass}>
          {t("filter.search")}
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-ink/60">{t("empty")}</p>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/60">
              <tr>
                <th className="p-3 font-medium">{t("col.email")}</th>
                <th className="p-3 font-medium">{t("col.name")}</th>
                <th className="p-3 font-medium">{t("col.role")}</th>
                <th className="p-3 font-medium">{t("col.inAdminList")}</th>
                <th className="p-3 font-medium">{t("col.signedUp")}</th>
                <th className="p-3 font-medium">{t("col.ownedEvents")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-b border-ink/5 last:border-0">
                  <td className="p-3 font-medium break-all">{user.email}</td>
                  <td className="p-3">{user.name ?? "—"}</td>
                  <td className="p-3">{t(`role.${user.role}`)}</td>
                  <td className="p-3">{user.inAdminList ? t("yes") : t("no")}</td>
                  <td className="p-3 whitespace-nowrap">{formatEventDay(user.createdAt, locale as AppLocale)}</td>
                  <td className="p-3 tabular-nums">
                    {user.ownedEvents > 0 ? (
                      <Link href={`/admin/events?q=${encodeURIComponent(user.email ?? "")}`} className={linkClass}>
                        {user.ownedEvents}
                      </Link>
                    ) : (
                      0
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/users" params={{ q }} page={page} total={total} />
    </div>
  );
}
