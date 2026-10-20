import "server-only";
import type { ModerationState, Prisma, UploadKind } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { MEDIA_URL_TTL_SEC, storage } from "@/server/media/storage";

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

export type GalleryItem =
  | {
      type: "upload";
      id: string;
      kind: UploadKind;
      guestName: string;
      createdAt: Date;
      moderation: ModerationState;
      width: number | null;
      height: number | null;
      durationSec: number | null;
      thumbUrl: string | null;
      displayUrl: string | null;
      originalUrl: string | null;
    }
  | { type: "wish"; id: string; guestName: string; createdAt: Date; moderation: ModerationState; message: string };

const KIND_FOR_FILTER: Partial<Record<GalleryFilter, UploadKind>> = { photo: "PHOTO", video: "VIDEO", voice: "VOICE" };

export const PAGE_SIZE = 30;

/**
 * One page of the gallery: uploads and wishes merged by time.
 * `audience: "guest"` shows only visible, ready items and never links the private original.
 */
export async function listGallery(eventId: string, query: GalleryQuery, audience: "host" | "guest") {
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
    wantWishes
      ? db.wish.findMany({ where: { eventId, ...visibility, ...nameFilter, ...timeCursor }, orderBy, take })
      : [],
  ]);

  const merged = [
    ...uploads.map((u) => ({ sortKey: u.createdAt.getTime(), id: u.id, upload: u })),
    ...wishes.map((w) => ({ sortKey: w.createdAt.getTime(), id: w.id, wish: w })),
  ].sort((a, b) => (desc ? b.sortKey - a.sortKey || (b.id < a.id ? -1 : 1) : a.sortKey - b.sortKey || (a.id < b.id ? -1 : 1)));

  const page = merged.slice(0, PAGE_SIZE);
  const store = storage();
  const items: GalleryItem[] = await Promise.all(
    page.map(async (entry): Promise<GalleryItem> => {
      if ("wish" in entry) {
        const w = entry.wish;
        return { type: "wish", id: w.id, guestName: w.guestName, createdAt: w.createdAt, moderation: w.moderation, message: w.message };
      }
      const u = entry.upload;
      const sign = (key: string | null, filename?: string) =>
        key ? store.getDownloadUrl(key, { expiresInSec: MEDIA_URL_TTL_SEC, ...(filename ? { filename } : {}) }) : Promise.resolve(null);
      const ext = u.mimeType.split("/")[1]?.replace("jpeg", "jpg").replace("quicktime", "mov") ?? "bin";
      const [thumbUrl, displayUrl, originalUrl] = await Promise.all([
        sign(u.thumbKey),
        sign(u.displayKey),
        audience === "host" ? sign(u.objectKey, `${u.guestName}-${u.id}.${ext}`) : Promise.resolve(null),
      ]);
      return {
        type: "upload",
        id: u.id,
        kind: u.kind,
        guestName: u.guestName,
        createdAt: u.createdAt,
        moderation: u.moderation,
        width: u.width,
        height: u.height,
        durationSec: u.durationSec,
        thumbUrl,
        displayUrl,
        originalUrl,
      };
    }),
  );

  const last = page.at(-1);
  const nextCursor = merged.length > PAGE_SIZE && last ? `${new Date(last.sortKey).toISOString()}_${last.id}` : null;
  return { items, nextCursor };
}