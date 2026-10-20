"use client";

import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** Links to the same page in the other language. */
export function LocaleToggle({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const other: Locale = locale === "ms" ? "en" : "ms";
  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      className="inline-flex min-h-11 items-center rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
    >
      {label}
    </Link>
  );
}
