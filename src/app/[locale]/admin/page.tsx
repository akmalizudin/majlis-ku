import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/session";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requireAdmin(locale as Locale);
  const t = await getTranslations("admin");
  if (!admin) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-serif text-3xl">{t("forbiddenTitle")}</h1>
          <p className="mt-3 text-ink/70">{t("forbiddenBody")}</p>
        </main>
      </>
    );
  }
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-serif text-3xl">{t("title")}</h1>
      </main>
    </>
  );
}
