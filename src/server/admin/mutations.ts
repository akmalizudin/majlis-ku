import "server-only";
import { Prisma, type PlanCode } from "@prisma/client";
import { templateDefaults, type TemplateFormOutput } from "@/lib/schemas/admin";
import { db } from "@/server/db";
import { deleteEventCompletely } from "@/server/events/members";
import { bus } from "@/server/realtime/bus";
import { writeAudit } from "./audit";
import { canDeactivateTemplate, checkPlanUpdate, nextEventStatus, nextReportStatus, planAuditDiff, planChange, type PlanEditable } from "./rules";

export type AdminError =
  | "forbidden"
  | "validation"
  | "not_found"
  | "invalid_plan"
  | "same_plan"
  | "invalid_status"
  | "confirm"
  | "has_payments"
  | "free_required"
  | "code_taken"
  | "last_active_template";

export type AdminResult = { ok: true } | { ok: false; error: AdminError; fields?: string[] };

const OK: AdminResult = { ok: true };
const fail = (error: AdminError): AdminResult => ({ ok: false, error });

/** Each mutation loads its target, applies the pure rule, and writes the change with its audit row in one transaction. */
export async function changeEventPlan(actorId: string, eventId: string, planCode: PlanCode): Promise<AdminResult> {
  return db.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, status: true, startsAt: true, planId: true, plan: { select: { code: true } } },
    });
    if (!event) return fail("not_found");
    const plan = await tx.plan.findUnique({ where: { code: planCode }, select: { id: true, active: true, retentionDays: true } });
    const change = planChange(event, plan, new Date());
    if (!change.ok) return fail(change.error);
    // planId and status in the where clause: a concurrent plan change, delete or retention purge loses instead of auditing a stale "from".
    const { count } = await tx.event.updateMany({ where: { id: eventId, planId: event.planId, status: event.status }, data: change.data });
    if (count === 0) return fail("not_found");
    await writeAudit(tx, {
      actorId,
      action: "EVENT_PLAN_CHANGED",
      targetType: "event",
      targetId: eventId,
      details: { slug: event.slug, from: event.plan.code, to: planCode },
    });
    return OK;
  });
}

async function setSuspended(actorId: string, eventId: string, action: "suspend" | "unsuspend"): Promise<AdminResult> {
  const result = await db.$transaction(async (tx): Promise<AdminResult> => {
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { slug: true, status: true } });
    if (!event) return fail("not_found");
    const status = nextEventStatus(event.status, action);
    if (!status) return fail("invalid_status");
    // The status in the where clause makes a concurrent change lose instead of overwrite.
    const { count } = await tx.event.updateMany({
      where: { id: eventId, status: event.status },
      data: { status, suspendedAt: action === "suspend" ? new Date() : null },
    });
    if (count === 0) return fail("invalid_status");
    await writeAudit(tx, {
      actorId,
      action: action === "suspend" ? "EVENT_SUSPENDED" : "EVENT_UNSUSPENDED",
      targetType: "event",
      targetId: eventId,
      details: { slug: event.slug },
    });
    return OK;
  });
  // After commit, so a guest stream that reconnects straight away already sees the 404.
  if (result.ok && action === "suspend") bus.publish(eventId, { type: "closed" });
  return result;
}

export const suspendEvent = (actorId: string, eventId: string) => setSuspended(actorId, eventId, "suspend");
export const unsuspendEvent = (actorId: string, eventId: string) => setSuspended(actorId, eventId, "unsuspend");

export async function adminDeleteEvent(actorId: string, eventId: string, confirmSlug: string): Promise<AdminResult> {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { slug: true } });
  if (!event) return fail("not_found");
  if (confirmSlug !== event.slug) return fail("confirm");
  const deleted = await deleteEventCompletely(eventId);
  if (!deleted.ok) return fail(deleted.code);
  await writeAudit(db, { actorId, action: "EVENT_DELETED", targetType: "event", targetId: eventId, details: { slug: event.slug } });
  return OK;
}

export async function handleReport(actorId: string, reportId: string, outcome: "RESOLVED" | "DISMISSED"): Promise<AdminResult> {
  return db.$transaction(async (tx) => {
    const report = await tx.abuseReport.findUnique({
      where: { id: reportId },
      select: { status: true, reason: true, event: { select: { slug: true } } },
    });
    if (!report) return fail("not_found");
    const status = nextReportStatus(report.status, outcome);
    if (!status) return fail("invalid_status");
    const { count } = await tx.abuseReport.updateMany({
      where: { id: reportId, status: "OPEN" },
      data: { status, handledById: actorId, handledAt: new Date() },
    });
    if (count === 0) return fail("invalid_status");
    await writeAudit(tx, {
      actorId,
      action: outcome === "RESOLVED" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
      targetType: "report",
      targetId: reportId,
      details: { eventSlug: report.event.slug, reason: report.reason }, // never the guest's details text
    });
    return OK;
  });
}

export async function updatePlan(actorId: string, planId: string, input: PlanEditable): Promise<AdminResult> {
  return db.$transaction(async (tx) => {
    const before = await tx.plan.findUnique({ where: { id: planId } });
    if (!before) return fail("not_found");
    if (checkPlanUpdate(before.code, input)) return fail("free_required");
    const after = await tx.plan.update({ where: { id: planId }, data: input });
    const changes = planAuditDiff(before, after);
    if (Object.keys(changes).length > 0) {
      await writeAudit(tx, { actorId, action: "PLAN_UPDATED", targetType: "plan", targetId: planId, details: { code: before.code, changes } });
    }
    return OK;
  });
}

const isUniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export async function saveTemplate(
  actorId: string,
  templateId: string | null,
  input: TemplateFormOutput & { code?: string },
): Promise<AdminResult> {
  const { code, ...fields } = input;
  const data = { nameMs: fields.nameMs, nameEn: fields.nameEn, active: fields.active, sortOrder: fields.sortOrder, defaults: templateDefaults(fields) };
  try {
    return await db.$transaction(async (tx) => {
      if (templateId === null) {
        if (!code) return fail("validation");
        const created = await tx.template.create({ data: { code, ...data } });
        await writeAudit(tx, { actorId, action: "TEMPLATE_CREATED", targetType: "template", targetId: created.id, details: { code } });
        return OK;
      }
      const current = await tx.template.findUnique({ where: { id: templateId }, select: { code: true, active: true } });
      if (!current) return fail("not_found");
      if (current.active && !data.active) {
        // Lock the active rows so two admins deactivating different templates cannot both pass the count.
        await tx.$queryRaw`SELECT id FROM "Template" WHERE active = true FOR UPDATE`;
        const activeCount = await tx.template.count({ where: { active: true } });
        if (!canDeactivateTemplate(activeCount, current.active, data.active)) return fail("last_active_template");
      }
      await tx.template.update({ where: { id: templateId }, data });
      await writeAudit(tx, { actorId, action: "TEMPLATE_UPDATED", targetType: "template", targetId: templateId, details: { code: current.code } });
      return OK;
    });
  } catch (error) {
    // The only unique column besides the id is code, so P2002 here means a taken code (also when two admins race).
    if (isUniqueViolation(error)) return fail("code_taken");
    throw error;
  }
}
