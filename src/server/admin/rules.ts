import type { EventStatus, PlanCode, ReportStatus } from "@prisma/client";
import type { PlanFormOutput } from "@/lib/schemas/admin";
import { computePurgeAt } from "@/server/events/retention";

/** The admin-editable plan fields (bytes as bigint, as Prisma returns them). */
export type PlanEditable = PlanFormOutput;

export function nextEventStatus(status: EventStatus, action: "suspend" | "unsuspend"): EventStatus | null {
  if (action === "suspend") return status === "ACTIVE" ? "SUSPENDED" : null;
  return status === "SUSPENDED" ? "ACTIVE" : null;
}

export type PlanChangeResult =
  | { ok: true; data: { planId: string; planActivatedAt: Date; purgeAt: Date } }
  | { ok: false; error: "invalid_status" | "invalid_plan" | "same_plan" };

export function planChange(
  event: { status: EventStatus; startsAt: Date; planId: string },
  plan: { id: string; active: boolean; retentionDays: number } | null,
  now: Date,
): PlanChangeResult {
  if (event.status !== "ACTIVE" && event.status !== "SUSPENDED") return { ok: false, error: "invalid_status" };
  if (!plan || !plan.active) return { ok: false, error: "invalid_plan" };
  if (plan.id === event.planId) return { ok: false, error: "same_plan" };
  return {
    ok: true,
    data: {
      planId: plan.id,
      planActivatedAt: now,
      purgeAt: computePurgeAt({ startsAt: event.startsAt, retentionDays: plan.retentionDays, now }),
    },
  };
}

export function nextReportStatus(status: ReportStatus, outcome: "RESOLVED" | "DISMISSED"): ReportStatus | null {
  return status === "OPEN" ? outcome : null;
}

/** Every new event starts on Free, so it must stay active and cost RM 0. */
export function checkPlanUpdate(code: PlanCode, input: PlanEditable): "free_required" | null {
  return code === "FREE" && (!input.active || input.priceSen !== 0) ? "free_required" : null;
}

type Scalar = string | number | boolean | null;

const bytesToMb = (bytes: bigint | null): number | null => (bytes === null ? null : Number(bytes / BigInt(1024 * 1024)));

/** The editable fields as audit values: bytes become MB numbers. Picks keys explicitly so extra Plan columns never leak. */
function auditFields(p: PlanEditable): Record<string, Scalar> {
  return {
    nameMs: p.nameMs,
    nameEn: p.nameEn,
    priceSen: p.priceSen,
    uploadLimit: p.uploadLimit,
    videoAllowed: p.videoAllowed,
    maxVideoSeconds: p.maxVideoSeconds,
    maxUploadMb: bytesToMb(p.maxUploadBytes),
    storageLimitMb: bytesToMb(p.storageLimitBytes),
    retentionDays: p.retentionDays,
    active: p.active,
    sortOrder: p.sortOrder,
  };
}

/** Changed fields only, as JSON-safe values (never a bigint). */
export function planAuditDiff(before: PlanEditable, after: PlanEditable): Record<string, { from: Scalar; to: Scalar }> {
  const from = auditFields(before);
  const to = auditFields(after);
  const diff: Record<string, { from: Scalar; to: Scalar }> = {};
  for (const key of Object.keys(to)) {
    if (from[key] !== to[key]) diff[key] = { from: from[key] ?? null, to: to[key] ?? null };
  }
  return diff;
}

export function canDeactivateTemplate(activeCount: number, currentlyActive: boolean, nextActive: boolean): boolean {
  return !(currentlyActive && !nextActive && activeCount <= 1);
}
