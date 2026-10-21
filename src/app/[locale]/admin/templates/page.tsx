import { getTranslations, setRequestLocale } from "next-intl/server";
import { Forbidden } from "@/components/admin/forbidden";
import { templateFormLabels } from "@/components/admin/labels";
import { TemplateForm } from "@/components/admin/template-form";
import { cardClass } from "@/components/admin/ui";
import type { Locale } from "@/i18n/routing";
import { listAllTemplates } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

export default async function AdminTemplatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const [t, templates, createLabels, saveLabels] = await Promise.all([
    getTranslations("admin"),
    listAllTemplates(),
    templateFormLabels("create"),
    templateFormLabels("save"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">{t("nav.templates")}</h1>
      <p className="text-sm text-ink/70">{t("templates.intro")}</p>
      <ul className="space-y-3">
        {templates.map((template) => (
          <li key={template.id} className={cardClass}>
            <div className="flex flex-wrap items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-20 shrink-0 items-end justify-end rounded-lg border border-ink/10 p-1.5"
                style={{ backgroundColor: template.style.background }}
              >
                <span className="size-4 rounded-full" style={{ backgroundColor: template.style.primary }} />
                <span className="ml-1 size-4 rounded-full" style={{ backgroundColor: template.style.accent }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{locale === "ms" ? template.nameMs : template.nameEn}</p>
                <p className="text-xs text-ink/60">
                  <span className="font-mono">{template.code}</span> · {t(`templates.layoutOption.${template.style.layout}`)} · {t(`templates.fontOption.${template.style.font}`)} ·{" "}
                  {template.active ? t("templates.active") : t("templates.inactive")}
                </p>
              </div>
            </div>
            <details className="mt-3">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium underline">{t("templates.edit")}</summary>
              <div className="mt-3">
                <TemplateForm
                  templateId={template.id}
                  labels={saveLabels}
                  values={{
                    code: template.code,
                    nameMs: template.nameMs,
                    nameEn: template.nameEn,
                    layout: template.style.layout,
                    font: template.style.font,
                    primary: template.style.primary.toLowerCase(),
                    background: template.style.background.toLowerCase(),
                    accent: template.style.accent.toLowerCase(),
                    active: template.active,
                    sortOrder: String(template.sortOrder),
                  }}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <section className={cardClass}>
        <h2 className="mb-3 font-serif text-2xl">{t("templates.create")}</h2>
        <TemplateForm
          templateId={null}
          labels={createLabels}
          values={{ code: "", nameMs: "", nameEn: "", layout: "classic", font: "serif", primary: "#7a1f2b", background: "#fbf3e4", accent: "#c9a227", active: true, sortOrder: String(templates.length + 1) }}
        />
      </section>
    </div>
  );
}
