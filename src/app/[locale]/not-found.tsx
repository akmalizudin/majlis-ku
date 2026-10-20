import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
      <h1 className="font-serif text-3xl">{t("notFoundTitle")}</h1>
      <p className="mt-3 text-ink/70">{t("notFoundBody")}</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-white">
        {t("home")}
      </Link>
    </main>
  );
}
