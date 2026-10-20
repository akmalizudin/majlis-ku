import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";

export default async function CheckEmailPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const dev = process.env.NODE_ENV !== "production" && !process.env.EMAIL_SERVER;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-10 text-center">
        <h1 className="font-serif text-3xl">{t("checkEmailTitle")}</h1>
        <p className="mt-3 text-ink/70">{t("checkEmailBody")}</p>
        {dev ? <p className="mt-3 text-sm text-ink/60">{t("devHint")}</p> : null}
      </main>
    </>
  );
}
