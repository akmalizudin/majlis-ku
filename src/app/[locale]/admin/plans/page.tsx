import { getTranslations, setRequestLocale } from "next-intl/server";
import { Forbidden } from "@/components/admin/forbidden";
import { planFormLabels } from "@/components/admin/labels";
import { PlanForm } from "@/components/admin/plan-form";
import { cardClass } from "@/components/admin/ui";
import type { Locale } from "@/i18n/routing";
import { formatSen } from "@/lib/money";
import { listPlans } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

const MB = BigInt(1024 * 1024);
/** 4000 -> "40.00", by integer arithmetic (no floats for money). */
const ringgit = (sen: number) => `${Math.floor(sen / 100)}.${String(sen % 100).padStart(2, "0")}`;
const mb = (bytes: bigint | null) => (bytes === null ? "" : String(bytes / MB));

export default async function AdminPlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin(locale as Locale))) return <Forbidden />;
  const [t, plans, labels] = await Promise.all([getTranslations("admin"), listPlans(), planFormLabels()]);
  const yesNo = (value: boolean) => (value ? t("yes") : t("no"));
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">{t("nav.plans")}</h1>
      <p className="text-sm text-ink/70">{t("plans.intro")}</p>
      {plans.map((plan) => (
        <section key={plan.id} className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">
              {t(`planCode.${plan.code}`)} <span className="font-mono text-sm text-ink/60">{plan.code}</span>
            </h2>
            <p className="text-sm text-ink/60">{formatSen(plan.priceSen)}</p>
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-6 text-sm text-ink/70">
            <div>
              <dt className="inline">{t("plans.includesGallery")}: </dt>
              <dd className="inline font-medium">{yesNo(plan.includesGallery)}</dd>
            </div>
            <div>
              <dt className="inline">{t("plans.includesEcard")}: </dt>
              <dd className="inline font-medium">{yesNo(plan.includesEcard)}</dd>
            </div>
          </dl>
          {plan.code === "FREE" ? <p className="mt-2 text-sm text-ink/60">{t("plans.freeNote")}</p> : null}
          <div className="mt-4">
            <PlanForm
              planId={plan.id}
              labels={labels}
              values={{
                nameMs: plan.nameMs,
                nameEn: plan.nameEn,
                price: ringgit(plan.priceSen),
                uploadLimit: plan.uploadLimit === null ? "" : String(plan.uploadLimit),
                videoAllowed: plan.videoAllowed,
                maxVideoSeconds: plan.maxVideoSeconds === null ? "" : String(plan.maxVideoSeconds),
                maxUploadMb: mb(plan.maxUploadBytes),
                storageLimitMb: mb(plan.storageLimitBytes),
                retentionDays: String(plan.retentionDays),
                active: plan.active,
                sortOrder: String(plan.sortOrder),
              }}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
