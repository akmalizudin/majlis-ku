import { getTranslations } from "next-intl/server";

export async function Forbidden() {
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-serif text-3xl">{t("forbiddenTitle")}</h1>
      <p className="mt-3 text-ink/70">{t("forbiddenBody")}</p>
    </div>
  );
}
