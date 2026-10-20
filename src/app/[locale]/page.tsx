import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-12 text-center sm:py-20">
          <h1 className="mx-auto max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink/75">{t("heroBody")}</p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand px-8 text-lg font-medium text-white hover:bg-brand-dark"
          >
            {t("cta")}
          </Link>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl">{t("guestbookTitle")}</h2>
            <p className="mt-2 text-ink/75">{t("guestbookBody")}</p>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl">{t("ecardTitle")}</h2>
            <p className="mt-2 text-ink/75">{t("ecardBody")}</p>
          </article>
        </section>
      </main>
    </>
  );
}
