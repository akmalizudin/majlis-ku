import type { Prisma } from "@prisma/client";
import type { PurgeCounts } from "./run-purge";

type Tx = Prisma.TransactionClient;
type Audit = (tx: Tx, entry: { actorId: null; action: "EVENT_PURGED"; targetType: "event"; targetId: string; details: PurgeCounts & { slug: string } }) => Promise<void>;

// Guest data tables of one event. Payment, EventMember and AuditLog are never touched.
async function deleteRows(tx: Tx, eventId: string): Promise<PurgeCounts> {
  const where = { eventId };
  const uploads = (await tx.upload.deleteMany({ where })).count;
  const wishes = (await tx.wish.deleteMany({ where })).count;
  const rsvps = (await tx.rsvp.deleteMany({ where })).count;
  await tx.guest.deleteMany({ where });
  const reports = (await tx.abuseReport.deleteMany({ where })).count;
  await tx.eCard.deleteMany({ where });
  return { uploads, wishes, rsvps, reports };
}

/** Transaction body of the purge. `audit` is `writeAudit` (server-only, so passed in to keep this unit-testable). */
export async function finalizePurge(tx: Tx, id: string, now: Date, audit: Audit) {
  const counts = await deleteRows(tx, id);
  // archivedAt: null makes the second of two concurrent runs update 0 rows and write no audit row.
  const done = await tx.event.updateMany({
    where: { id, archivedAt: null },
    data: { archivedAt: now, coverKey: null, pinHash: null, uploadCount: 0, storageBytes: 0 },
  });
  const finalized = done.count === 1;
  if (finalized) {
    // The admin audit page summarises an entry by its slug.
    const event = await tx.event.findUnique({ where: { id }, select: { slug: true } });
    await audit(tx, { actorId: null, action: "EVENT_PURGED", targetType: "event", targetId: id, details: { slug: event?.slug ?? "", ...counts } });
  }
  return { finalized, counts };
}

/** Re-sweep body: rows that appeared after the purge, and a cover saved after the claim. */
export async function sweepRows(tx: Tx, id: string) {
  await deleteRows(tx, id);
  await tx.event.updateMany({ where: { id }, data: { coverKey: null } });
}
