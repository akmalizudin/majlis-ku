import "server-only";
import { getTranslations } from "next-intl/server";
import type { AdminError } from "@/server/admin/mutations";
import type { EventActionLabels, ReportActionLabels } from "./event-actions";
import type { ResultLabels } from "./form-kit";
import type { PlanFormLabels } from "./plan-form";
import type { TemplateFormLabels } from "./template-form";

const ERRORS: AdminError[] = [
  "forbidden",
  "validation",
  "not_found",
  "invalid_plan",
  "same_plan",
  "invalid_status",
  "confirm",
  "has_payments",
  "free_required",
  "code_taken",
  "last_active_template",
];

export async function resultLabels(): Promise<ResultLabels> {
  const t = await getTranslations("admin");
  return { saved: t("saved"), check: t("check"), errors: Object.fromEntries(ERRORS.map((code) => [code, t(`error.${code}`)])) as ResultLabels["errors"] };
}

export async function eventActionLabels(): Promise<EventActionLabels & ReportActionLabels> {
  const [t, result] = await Promise.all([getTranslations("admin"), resultLabels()]);
  return {
    result,
    changePlan: t("event.changePlan"),
    changePlanHelp: t("event.changePlanHelp"),
    changePlanButton: t("event.changePlanButton"),
    plan: t("col.plan"),
    suspend: t("event.suspend"),
    unsuspend: t("event.unsuspend"),
    suspendHelp: t("event.suspendHelp"),
    deleteTitle: t("event.deleteTitle"),
    deleteBody: t("event.deleteBody"),
    deleteLabel: t("event.deleteLabel"),
    deleteButton: t("event.deleteButton"),
    resolve: t("reports.resolve"),
    dismiss: t("reports.dismiss"),
  };
}

export async function planFormLabels(): Promise<PlanFormLabels> {
  const [t, result] = await Promise.all([getTranslations("admin.plans"), resultLabels()]);
  return {
    result,
    fields: {
      nameMs: t("nameMs"),
      nameEn: t("nameEn"),
      price: t("price"),
      uploadLimit: t("uploadLimit"),
      videoAllowed: t("videoAllowed"),
      maxVideoSeconds: t("maxVideoSeconds"),
      maxUploadMb: t("maxUploadMb"),
      storageLimitMb: t("storageLimitMb"),
      retentionDays: t("retentionDays"),
      active: t("active"),
      sortOrder: t("sortOrder"),
    },
    notes: {
      uploadLimit: t("uploadLimitNote"),
      maxVideoSeconds: t("maxVideoSecondsNote"),
      maxUploadMb: t("maxUploadMbNote"),
      storageLimitMb: t("storageLimitMbNote"),
      retentionDays: t("retentionDaysNote"),
    },
    save: t("save"),
  };
}

export async function templateFormLabels(mode: "create" | "save"): Promise<TemplateFormLabels> {
  const [t, result] = await Promise.all([getTranslations("admin.templates"), resultLabels()]);
  return {
    result,
    fields: {
      code: t("code"),
      nameMs: t("nameMs"),
      nameEn: t("nameEn"),
      layout: t("layout"),
      font: t("font"),
      primary: t("primary"),
      background: t("background"),
      accent: t("accent"),
      active: t("active"),
      sortOrder: t("sortOrder"),
    },
    codeNote: t("codeNote"),
    layouts: { classic: t("layoutOption.classic"), modern: t("layoutOption.modern"), floral: t("layoutOption.floral") },
    fonts: { serif: t("fontOption.serif"), sans: t("fontOption.sans") },
    save: mode === "create" ? t("createButton") : t("save"),
  };
}
