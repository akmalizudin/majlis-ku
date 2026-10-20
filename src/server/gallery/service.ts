import "server-only";
import type { Prisma, UploadKind } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { uploadToItem, wishToItem, type Audience, type GalleryItem } from "./items";

export type { GalleryItem } from "./items";

export const GALLERY_FILTERS = ["all", "photo", "video", "voice", "wish"] as const;
export type GalleryFilter = (typeof GALLERY_FILTERS)[number];

export const galleryQuerySchema = z.object({
  filter: z.enum(GALLERY_FILTERS).catch("all"),
  q: z.string().trim().max(40).catch(""),
  sort: z.enum(["newest", "oldest"]).catch("newest"),
  // Cursor: ISO date of the last item shown, plus its id for ties.
  after: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z_[a-z0-9]+$/)
    .optional()
    .catch(undefined),
});

export type GalleryQuery = z.output<typeof galleryQuerySchema>;

export const KIND_FOR_FILTER: Partial<Record<GalleryFilter, UploadKind>> = { photo: "PHOTO", video: "VIDEO", voice: "VOICE" };

export const PAGE_SIZE = 30;

/**
 * One page of the gallery: uploads and wishes merged by time.
 * `audience: "guest"` shows only visible, ready items and never links the private original.
 */
export async function listGallery(eventId: string, query: GalleryQuery, audience: Audience) {
  const take = PAGE_SIZE + 1;
  const desc = query.sort === "newest";
  const [afterIso, afterId] = query.after?.split("_") ?? [];
  const afterDate = afterIso ? new Date(afterIso) : null;

  const timeCursor = afterDate
    ? {
        OR: [
          { createdAt: desc ? { lt: afterDate } : { gt: afterDate } },
          { createdAt: afterDate, id: desc ? { lt: afterId } : { gt: afterId } },
        ],
      }
    : {};
  const nameFilter = query.q ? { guestName: { contains: query.q, mode: "insensitive" as const } } : {};
  const visibility = audience === "guest" ? { moderation: "VISIBLE" as const } : {};
  const orderBy = [{ createdAt: desc ? "desc" : "asc" }, { id: desc ? "desc" : "asc" }] satisfies Prisma.UploadOrderByWithRelationInput[];

  const wantUploads = query.filter !== "wish";
  const wantWishes = query.filter === "all" || query.filter === "wish";
  const kind = KIND_FOR_FILTER[query.filter];

  const [uploads, wishes] = await Promise.all([
    wantUploads
      ? db.upload.findMany({
          where: { eventId, status: "READY", ...(kind ? { kind } : {}), ...visibility, ...nameFilter, ...timeCursor },
          orderBy,
          take,
        })
      : [],
    wantWishes ? db.wish.findMany({ where: { eventId, ...visibility, ...nameFilter, ...timeCursor }, orderBy, take }) : [],
  ]);

  const merged = [
    ...uploads.map((u) => ({ sortKey: u.createdAt.getTime(), id: u.id, upload: u })),
    ...wishes.map((w) => ({ sortKey: w.createdAt.getTime(), id: w.id, wish: w })),
  ].sort((a, b) => (desc ? b.sortKey - a.sortKey || (b.id < a.id ? -1 : 1) : a.sortKey - b.sortKey || (a.id < b.id ? -1 : 1)));

  const page = merged.slice(0, PAGE_SIZE);
  const items: GalleryItem[] = await Promise.all(
    page.map((entry) => ("wish" in entry ? Promise.resolve(wishToItem(entry.wish)) : uploadToItem(entry.upload, audience))),
  );

  const last = page.at(-1);
  const nextCursor = merged.length > PAGE_SIZE && last ? `${new Date(last.sortKey).toISOString()}_${last.id}` : null;
  return { items, nextCursor };
}
