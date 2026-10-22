import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";

/** A legal page: title, intro, then each section's heading, paragraph and optional list. `extra` adds content after a section's paragraph. */
export async function LegalDocument({
  ns,
  sections,
  extra = {},
}: {
  ns: "privacy" | "terms";
  sections: readonly string[];
  extra?: Record<string, ReactNode>;
}) {
  const t = await getTranslations(`legal.${ns}`);
  return (
    <main className="mx-auto w-full max-w-prose px-4 pb-8">
      <h1 className="font-serif text-3xl">{t("title")}</h1>
      <p className="mt-1 text-sm text-ink/70">{t("updated")}</p>
      <p className="mt-4">{t("intro")}</p>
      {sections.map((key) => (
        <section key={key} className="mt-8">
          <h2 className="font-serif text-xl">{t(`${key}.title`)}</h2>
          <p className="mt-2 text-ink/85">{t(`${key}.body`, LEGAL)}</p>
          {t.has(`${key}.items`) ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/85">
              {(t.raw(`${key}.items`) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {extra[key]}
        </section>
      ))}
    </main>
  );
}
