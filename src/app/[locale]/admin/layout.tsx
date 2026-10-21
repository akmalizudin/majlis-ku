import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/session";

const SECTIONS = [
  ["overview", "/admin"],
  ["events", "/admin/events"],
  ["users", "/admin/users"],
  ["reports", "/admin/reports"],
  ["plans", "/admin/plans"],
  ["templates", "/admin/templates"],
  ["audit", "/admin/audit"],
] as const;

/** The nav is for admins only; every page still checks access itself and shows the forbidden view. */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [admin, t] = await Promise.all([requireAdmin(locale as Locale), getTranslations("admin")]);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16">
        {admin ? <AdminNav label={t("navLabel")} links={SECTIONS.map(([key, href]) => ({ href, label: t(`nav.${key}`) }))} /> : null}
        <div className="mt-4">{children}</div>
      </main>
    </>
  );
}
