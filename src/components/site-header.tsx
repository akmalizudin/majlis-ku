import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LocaleToggle } from "./locale-toggle";

export async function SiteHeader() {
  const [t, locale, session] = await Promise.all([getTranslations("common"), getLocale(), auth()]);
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
      <Link href="/" className="font-serif text-xl font-semibold text-brand">
        {t("brand")}
      </Link>
      <nav className="flex items-center gap-2">
        {session?.user ? (
          <Link href="/dashboard" className="inline-flex min-h-11 items-center px-3 text-sm font-medium">
            {t("dashboard")}
          </Link>
        ) : (
          <Link href="/signin" className="inline-flex min-h-11 items-center px-3 text-sm font-medium">
            {t("signIn")}
          </Link>
        )}
        <LocaleToggle locale={locale as Locale} label={t("switchTo")} />
      </nav>
    </header>
  );
}