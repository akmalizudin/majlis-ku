"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  changePlanSchema,
  confirmSlugSchema,
  formFields,
  PLAN_FORM_FIELDS,
  planFormSchema,
  reportOutcomeSchema,
  TEMPLATE_FORM_FIELDS,
  templateCreateSchema,
  templateFormSchema,
} from "@/lib/schemas/admin";
import { requireAdminAction } from "./access";
import {
  adminDeleteEvent,
  changeEventPlan,
  handleReport,
  saveTemplate,
  suspendEvent,
  unsuspendEvent,
  updatePlan,
  type AdminResult,
} from "./mutations";

/** Admin check first, then the work; the layout is revalidated after a success. */
async function asAdmin(run: (actorId: string) => Promise<AdminResult>): Promise<AdminResult> {
  const admin = await requireAdminAction();
  if (!admin) return { ok: false, error: "forbidden" };
  const result = await run(admin.id);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

function invalid(error: z.ZodError): AdminResult {
  return { ok: false, error: "validation", fields: [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "form")))] };
}

export async function changeEventPlanAction(eventId: string, _prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  return asAdmin(async (actorId) => {
    const parsed = changePlanSchema.safeParse(formFields(formData, ["planCode"]));
    return parsed.success ? changeEventPlan(actorId, eventId, parsed.data.planCode) : invalid(parsed.error);
  });
}

export async function suspendEventAction(eventId: string): Promise<AdminResult> {
  return asAdmin((actorId) => suspendEvent(actorId, eventId));
}

export async function unsuspendEventAction(eventId: string): Promise<AdminResult> {
  return asAdmin((actorId) => unsuspendEvent(actorId, eventId));
}

export async function adminDeleteEventAction(locale: Locale, eventId: string, _prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const result = await asAdmin(async (actorId) => {
    const parsed = confirmSlugSchema.safeParse(formFields(formData, ["confirmSlug"]));
    return parsed.success ? adminDeleteEvent(actorId, eventId, parsed.data.confirmSlug) : invalid(parsed.error);
  });
  if (result.ok) return redirect({ href: "/admin/events", locale });
  return result;
}

export async function handleReportAction(reportId: string, formData: FormData): Promise<AdminResult> {
  return asAdmin(async (actorId) => {
    const parsed = reportOutcomeSchema.safeParse(formFields(formData, ["outcome"]));
    return parsed.success ? handleReport(actorId, reportId, parsed.data.outcome) : invalid(parsed.error);
  });
}

export async function updatePlanAction(planId: string, _prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  return asAdmin(async (actorId) => {
    const parsed = planFormSchema.safeParse(formFields(formData, PLAN_FORM_FIELDS));
    return parsed.success ? updatePlan(actorId, planId, parsed.data) : invalid(parsed.error);
  });
}

export async function saveTemplateAction(templateId: string | null, _prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  return asAdmin(async (actorId) => {
    // `code` is accepted on create only; the strict update schema rejects it.
    const parsed =
      templateId === null
        ? templateCreateSchema.safeParse(formFields(formData, ["code", ...TEMPLATE_FORM_FIELDS]))
        : templateFormSchema.safeParse(formFields(formData, TEMPLATE_FORM_FIELDS));
    return parsed.success ? saveTemplate(actorId, templateId, parsed.data) : invalid(parsed.error);
  });
}
