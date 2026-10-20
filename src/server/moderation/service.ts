import "server-only";
import type { Upload } from "@prisma/client";
import { db } from "@/server/db";
import { storage } from "@/server/media/storage";
import { bus } from "@/server/realtime/bus";
import { publishUpload, publishWish } from "@/server/uploads/processing";
import { nextModeration, type ModerationAction } from "./rules";

export type ItemType = "upload" | "wish";

/** Delete an upload's files and row, and give its slot and bytes back to the plan if it was counted. */
export async function deleteUpload(upload: Upload): Promise<void> {
  await storage().deletePrefix(`events/${upload.eventId}/${upload.id}`);
  const counted = upload.status === "READY" || upload.status === "PROCESSING";
  await db.$transaction([
    db.upload.delete({ where: { id: upload.id } }),
    ...(counted
      ? [db.event.update({ where: { id: upload.eventId }, data: { uploadCount: { decrement: 1 }, storageBytes: { decrement: upload.sizeBytes } } })]
      : []),
  ]);
}

/** Apply one moderation action. Returns false when the item does not exist or the action does not apply. */
export async function moderateItem(eventId: string, type: ItemType, id: string, action: ModerationAction | "delete"): Promise<boolean> {
  if (type === "upload") {
    const upload = await db.upload.findFirst({ where: { id, eventId } });
    if (!upload) return false;
    if (action === "delete") {
      await deleteUpload(upload);
      bus.publish(eventId, { type: "remove", id });
      return true;
    }
    const next = nextModeration(upload.moderation, action);
    if (!next) return false;
    await db.upload.update({ where: { id }, data: { moderation: next } });
    await publishUpload(id);
    return true;
  }

  const wish = await db.wish.findFirst({ where: { id, eventId } });
  if (!wish) return false;
  if (action === "delete") {
    await db.wish.delete({ where: { id } });
    bus.publish(eventId, { type: "remove", id });
    return true;
  }
  const next = nextModeration(wish.moderation, action);
  if (!next) return false;
  await db.wish.update({ where: { id }, data: { moderation: next } });
  await publishWish(id);
  return true;
}

/** Approve every waiting upload and wish. Returns how many were approved. */
export async function approveAll(eventId: string): Promise<number> {
  const [uploads, wishes] = await Promise.all([
    db.upload.findMany({ where: { eventId, moderation: "PENDING_APPROVAL" }, select: { id: true } }),
    db.wish.findMany({ where: { eventId, moderation: "PENDING_APPROVAL" }, select: { id: true } }),
  ]);
  await db.$transaction([
    db.upload.updateMany({ where: { id: { in: uploads.map((u) => u.id) } }, data: { moderation: "VISIBLE" } }),
    db.wish.updateMany({ where: { id: { in: wishes.map((w) => w.id) } }, data: { moderation: "VISIBLE" } }),
  ]);
  for (const u of uploads) await publishUpload(u.id);
  for (const w of wishes) await publishWish(w.id);
  return uploads.length + wishes.length;
}

export async function pendingCount(eventId: string): Promise<number> {
  const [uploads, wishes] = await Promise.all([
    db.upload.count({ where: { eventId, moderation: "PENDING_APPROVAL", status: "READY" } }),
    db.wish.count({ where: { eventId, moderation: "PENDING_APPROVAL" } }),
  ]);
  return uploads + wishes;
}