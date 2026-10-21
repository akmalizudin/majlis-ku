import "server-only";
import { db } from "@/server/db";
import { writeAudit } from "@/server/admin/audit";
import { eventPrefix } from "@/server/media/keys";
import { storage } from "@/server/media/storage";
import { bus } from "@/server/realtime/bus";
import { finalizePurge, sweepRows } from "./purge-data";
import { runPurge, type PurgeOps } from "./run-purge";

const ops: PurgeOps = {
  dueEventIds: async (now) =>
    (await db.event.findMany({ where: { purgeAt: { lte: now }, archivedAt: null }, select: { id: true } })).map((e) => e.id),

  claim: async (id, now) =>
    (await db.event.updateMany({ where: { id, purgeAt: { lte: now }, archivedAt: null }, data: { status: "ARCHIVED" } })).count === 1,

  closeStreams: (id) => bus.publish(id, { type: "closed" }),

  deleteFiles: (id) => storage().deletePrefix(eventPrefix(id)),

  deleteGuestData: (id, now) => db.$transaction((tx) => finalizePurge(tx, id, now, writeAudit)),

  recentlyArchivedIds: async (since) =>
    (await db.event.findMany({ where: { archivedAt: { gte: since } }, select: { id: true } })).map((e) => e.id),

  sweepGuestData: (id) => db.$transaction((tx) => sweepRows(tx, id)),

  deleteOldRateLimits: async (before) => void (await db.rateLimit.deleteMany({ where: { windowStart: { lt: before } } })),

  log: (line) => console.warn(line),
};

export function purgeExpiredEvents(now = new Date()) {
  return runPurge(ops, now);
}
