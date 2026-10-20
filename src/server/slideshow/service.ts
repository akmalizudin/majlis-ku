import "server-only";
import { db } from "@/server/db";
import { uploadToItem, wishToItem, type GalleryItem } from "@/server/gallery/items";

const LIMIT = 200;

/** Visible photos, videos and wishes, newest first. Voice notes are left out: nobody hears them at a venue. */
export async function slideshowItems(eventId: string): Promise<GalleryItem[]> {
  const [uploads, wishes] = await Promise.all([
    db.upload.findMany({
      where: { eventId, status: "READY", moderation: "VISIBLE", kind: { in: ["PHOTO", "VIDEO"] } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    db.wish.findMany({ where: { eventId, moderation: "VISIBLE" }, orderBy: { createdAt: "desc" }, take: LIMIT }),
  ]);
  const items = await Promise.all([...uploads.map((u) => uploadToItem(u, "guest")), ...wishes.map((w) => Promise.resolve(wishToItem(w)))]);
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, LIMIT);
}