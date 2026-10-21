import { describe, expect, it } from "vitest";
import {
  canDeactivateTemplate,
  checkPlanUpdate,
  nextEventStatus,
  nextReportStatus,
  planAuditDiff,
  planChange,
  type PlanEditable,
} from "@/server/admin/rules";

const MB = 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;

const editable: PlanEditable = {
  nameMs: "Percuma",
  nameEn: "Free",
  priceSen: 0,
  uploadLimit: 100,
  videoAllowed: false,
  maxVideoSeconds: null,
  maxUploadBytes: BigInt(15 * MB),
  storageLimitBytes: null,
  retentionDays: 30,
  active: true,
  sortOrder: 0,
};

describe("nextEventStatus", () => {
  it("suspends only active events and unsuspends only suspended ones", () => {
    expect(nextEventStatus("ACTIVE", "suspend")).toBe("SUSPENDED");
    expect(nextEventStatus("DRAFT", "suspend")).toBeNull();
    expect(nextEventStatus("ARCHIVED", "suspend")).toBeNull();
    expect(nextEventStatus("SUSPENDED", "suspend")).toBeNull();
    expect(nextEventStatus("SUSPENDED", "unsuspend")).toBe("ACTIVE");
    expect(nextEventStatus("ACTIVE", "unsuspend")).toBeNull();
  });
});

describe("planChange", () => {
  const now = new Date("2026-10-21T00:00:00Z");
  const premium = { id: "p2", active: true, retentionDays: 365 };

  it("changes plan for active and suspended events and recomputes purgeAt", () => {
    const past = { status: "ACTIVE" as const, startsAt: new Date("2026-01-01T00:00:00Z"), planId: "p1" };
    const result = planChange(past, premium, now);
    expect(result).toEqual({
      ok: true,
      data: { planId: "p2", planActivatedAt: now, purgeAt: new Date(now.getTime() + 365 * DAY) },
    });

    const future = { status: "SUSPENDED" as const, startsAt: new Date("2026-12-01T00:00:00Z"), planId: "p1" };
    const later = planChange(future, premium, now);
    expect(later).toMatchObject({ ok: true, data: { purgeAt: new Date(future.startsAt.getTime() + 365 * DAY) } });
  });

  it("refuses archived or draft events", () => {
    const base = { startsAt: now, planId: "p1" };
    expect(planChange({ ...base, status: "ARCHIVED" }, premium, now)).toEqual({ ok: false, error: "invalid_status" });
    expect(planChange({ ...base, status: "DRAFT" }, premium, now)).toEqual({ ok: false, error: "invalid_status" });
    // status is checked before the plan
    expect(planChange({ ...base, status: "DRAFT" }, null, now)).toEqual({ ok: false, error: "invalid_status" });
  });

  it("refuses an inactive, unknown or same plan", () => {
    const event = { status: "ACTIVE" as const, startsAt: now, planId: "p1" };
    expect(planChange(event, null, now)).toEqual({ ok: false, error: "invalid_plan" });
    expect(planChange(event, { ...premium, active: false }, now)).toEqual({ ok: false, error: "invalid_plan" });
    expect(planChange(event, { ...premium, id: "p1" }, now)).toEqual({ ok: false, error: "same_plan" });
    // an inactive plan is invalid even when it is the current one
    expect(planChange(event, { ...premium, id: "p1", active: false }, now)).toEqual({ ok: false, error: "invalid_plan" });
  });
});

describe("nextReportStatus", () => {
  it("handles a report only while open", () => {
    expect(nextReportStatus("OPEN", "RESOLVED")).toBe("RESOLVED");
    expect(nextReportStatus("OPEN", "DISMISSED")).toBe("DISMISSED");
    expect(nextReportStatus("RESOLVED", "DISMISSED")).toBeNull();
    expect(nextReportStatus("DISMISSED", "RESOLVED")).toBeNull();
  });
});

describe("checkPlanUpdate", () => {
  it("keeps the Free plan active at RM 0", () => {
    expect(checkPlanUpdate("FREE", editable)).toBeNull();
    expect(checkPlanUpdate("FREE", { ...editable, active: false })).toBe("free_required");
    expect(checkPlanUpdate("FREE", { ...editable, priceSen: 100 })).toBe("free_required");
    expect(checkPlanUpdate("ECARD", { ...editable, active: false, priceSen: 4000 })).toBeNull();
    expect(checkPlanUpdate("PREMIUM", { ...editable, priceSen: 100 })).toBeNull();
  });
});

describe("planAuditDiff", () => {
  it("lists only changed plan fields, bytes as MB", () => {
    const after = { ...editable, maxUploadBytes: BigInt(20 * MB) };
    expect(planAuditDiff(editable, after)).toEqual({ maxUploadMb: { from: 15, to: 20 } });
    expect(planAuditDiff(editable, editable)).toEqual({});
  });

  it("ignores fields that are not editable", () => {
    // A full Prisma Plan row: id, code and Date columns must never reach the audit JSON.
    const before = { ...editable, id: "p1", code: "FREE", createdAt: new Date(0), updatedAt: new Date(0) };
    const after = { ...editable, id: "p1", code: "FREE", createdAt: new Date(1), updatedAt: new Date(1), priceSen: 100 };
    expect(planAuditDiff(before, after)).toEqual({ priceSen: { from: 0, to: 100 } });
  });

  it("reports prices, flags and null limits without a bigint in the output", () => {
    const after: PlanEditable = {
      ...editable,
      priceSen: 4500,
      active: false,
      uploadLimit: null,
      storageLimitBytes: BigInt(2048 * MB),
      nameEn: "Free+",
    };
    const diff = planAuditDiff(editable, after);
    expect(diff).toEqual({
      nameEn: { from: "Free", to: "Free+" },
      priceSen: { from: 0, to: 4500 },
      uploadLimit: { from: 100, to: null },
      storageLimitMb: { from: null, to: 2048 },
      active: { from: true, to: false },
    });
    expect(() => JSON.stringify(diff)).not.toThrow();
  });
});

describe("canDeactivateTemplate", () => {
  it("never deactivates the last active template", () => {
    expect(canDeactivateTemplate(1, true, false)).toBe(false);
    expect(canDeactivateTemplate(0, true, false)).toBe(false);
    expect(canDeactivateTemplate(2, true, false)).toBe(true);
    expect(canDeactivateTemplate(1, true, true)).toBe(true);
    expect(canDeactivateTemplate(1, false, false)).toBe(true);
    expect(canDeactivateTemplate(1, false, true)).toBe(true);
  });
});
