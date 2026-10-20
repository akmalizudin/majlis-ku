import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { BRAND_COLOR } from "@/lib/brand";
import { env } from "@/lib/env";
import "../globals.css";

// Pages read the session (header, dashboard) and the database, so render per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: { default: t("metaTitle"), template: "%s · Majlis Ku" },
    description: t("metaDescription"),
    // Read at runtime through env(): process.env.NEXT_PUBLIC_* would be frozen at build time.
    metadataBase: new URL(env().NEXT_PUBLIC_APP_URL),
    appleWebApp: { capable: true, title: "Majlis Ku" },
  };
}

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale}>
      <body className="min-h-dvh font-sans antialiased">
        {/* Locale only: client components get their strings as props or a scoped provider, so guest pages stay light. */}
        <NextIntlClientProvider locale={locale} messages={null}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
