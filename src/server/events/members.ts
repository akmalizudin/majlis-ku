import "server-only";
import { db } from "@/server/db";
import { eventPrefix } from "@/server/media/keys";
import { storage } from "@/server/media/storage";
import { normalizeInviteEmail } from "./members-rules";

export async function listMembers(eventId: string) {
  return db.eventMember.findMany({
    where: { eventId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

export type InviteResult = { ok: true } | { ok: false; code: "invalid_email" | "already_member" };

/**
 * Add a co-host by email. The user row is created if needed; they get access the first time they
 * sign in with that email (magic link or Google), with no separate invitation token.
 */
export async function inviteCohost(eventId: string, rawEmail: string): Promise<InviteResult> {
  const email = normalizeInviteEmail(rawEmail);
  if (!email) return { ok: false, code: "invalid_email" };
  const user = await db.user.upsert({ where: { email }, update: {}, create: { email } });
  const existing = await db.eventMember.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
  if (existing) return { ok: false, code: "already_member" };
  await db.eventMember.create({ data: { eventId, userId: user.id, role: "COHOST" } });
  return { ok: true };
}

/** Owners are never removed this way. */
export async function removeCohost(eventId: string, userId: string): Promise<boolean> {
  const result = await db.eventMember.deleteMany({ where: { eventId, userId, role: "COHOST" } });
  return result.count > 0;
}

export type DeleteResult = { ok: true } | { ok: false; code: "has_payments" };

/** PDPA: remove the event, everything guests sent, and every file in storage. */
export async function deleteEventCompletely(eventId: string): Promise<DeleteResult> {
  const payments = await db.payment.count({ where: { eventId } });
  if (payments > 0) return { ok: false, code: "has_payments" };
  await storage().deletePrefix(eventPrefix(eventId));
  // Uploads, wishes, RSVPs, guests, members and the e-card go with it (onDelete: Cascade).
  await db.event.delete({ where: { id: eventId } });
  return { ok: true };
}