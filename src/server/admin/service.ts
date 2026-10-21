import "server-only";
import type { EventStatus, PlanCode, Prisma, ReportStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { templateStyle } from "@/server/ecard/templates";
import { isAdminEmail } from "@/server/auth/roles";

export const ADMIN_PAGE_SIZE = 50;

const pageArgs = (page: number) => ({ skip: (Math.max(1, Math.floor(page)) - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE });
const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });

const EVENT_STATUSES: EventStatus[] = ["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"];

export async function adminOverview() {
  const [users, byStatus, byPlan, openReports, storage, topEvents] = await Promise.all([
    db.user.count(),
    db.event.groupBy({ by: ["status"], _count: { _all: true } }),
    db.plan.findMany({ orderBy: { sortOrder: "asc" }, select: { code: true, _count: { select: { events: true } } } }),
    db.abuseReport.count({ where: { status: "OPEN" } }),
    db.event.aggregate({ _sum: { storageBytes: true } }),
    db.event.findMany({
      orderBy: { storageBytes: "desc" },
      take: 10,
      select: { id: true, slug: true, title: true, storageBytes: true },
    }),
  ]);
  return {
    users,
    eventsByStatus: EVENT_STATUSES.map((status) => ({ status, count: byStatus.find((row) => row.status === status)?._count._all ?? 0 })),
    eventsByPlan: byPlan.map((plan) => ({ code: plan.code, count: plan._count.events })),
    openReports,
    storageBytes: storage._sum.storageBytes ?? BigInt(0),
    topEvents,
  };
}

export async function listAdminEvents({ q, status, plan, page }: { q?: string; status?: EventStatus; plan?: PlanCode; page: number }) {
  const term = q?.trim();
  const where: Prisma.EventWhereInput = {
    ...(status ? { status } : {}),
    ...(plan ? { plan: { code: plan } } : {}),
    ...(term
      ? {
          OR: [
            { slug: contains(term) },
            { title: contains(term) },
            { hostNames: contains(term) },
            { members: { some: { role: "OWNER", user: { email: contains(term) } } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        startsAt: true,
        uploadCount: true,
        storageBytes: true,
        plan: { select: { code: true, nameMs: true, nameEn: true } },
        members: { where: { role: "OWNER" }, select: { user: { select: { email: true } } } },
      },
    }),
    db.event.count({ where }),
  ]);
  return { rows, total };
}

export async function getAdminEvent(id: string) {
  return db.event.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      hostNames: true,
      status: true,
      startsAt: true,
      createdAt: true,
      purgeAt: true,
      suspendedAt: true,
      planActivatedAt: true,
      uploadCount: true,
      storageBytes: true,
      plan: { select: { id: true, code: true, nameMs: true, nameEn: true } },
      members: { orderBy: { createdAt: "asc" }, select: { role: true, user: { select: { email: true, name: true } } } },
      reports: {
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        select: { id: true, reason: true, details: true, createdAt: true },
      },
    },
  });
}

export async function listAdminUsers({ q, page }: { q?: string; page: number }) {
  const term = q?.trim();
  const where: Prisma.UserWhereInput = term ? { OR: [{ email: contains(term) }, { name: contains(term) }] } : {};
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { memberships: { where: { role: "OWNER" } } } },
      },
    }),
    db.user.count({ where }),
  ]);
  const adminEmails = env().ADMIN_EMAILS;
  const rows = users.map(({ _count, ...user }) => ({
    ...user,
    ownedEvents: _count.memberships,
    inAdminList: isAdminEmail(user.email, adminEmails),
  }));
  return { rows, total };
}

export async function listReports({ status = "OPEN", page }: { status?: ReportStatus | "ALL"; page: number }) {
  const where: Prisma.AbuseReportWhereInput = status === "ALL" ? {} : { status };
  const [rows, total] = await Promise.all([
    db.abuseReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        handledAt: true,
        event: { select: { id: true, slug: true, title: true } },
      },
    }),
    db.abuseReport.count({ where }),
  ]);
  return { rows, total };
}

export async function listPlans() {
  return db.plan.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function listAllTemplates() {
  const templates = await db.template.findMany({ orderBy: { sortOrder: "asc" } });
  return templates.map((template) => ({ ...template, style: templateStyle(template.defaults) }));
}

export async function listAudit({ page }: { page: number }) {
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        details: true,
        createdAt: true,
        actor: { select: { email: true } },
      },
    }),
    db.auditLog.count(),
  ]);
  return { rows, total };
}
