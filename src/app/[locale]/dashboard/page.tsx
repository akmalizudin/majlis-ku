import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/session";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale as Locale);
  const [t, tc] = await Promise.all([getTranslations("dashboard"), getTranslations("common")]);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-serif text-3xl">{t("title")}</h1>
          <SignOutButton label={tc("signOut")} />
        </div>
        <p className="mt-1 text-sm text-ink/60">{t("signedInAs", { email: user.email })}</p>
        <p className="mt-8 rounded-2xl bg-white p-6 text-ink/70 shadow-sm">{t("empty")}</p>
      </main>
    </>
  );
}
