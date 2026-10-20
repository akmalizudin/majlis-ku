import "server-only";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import archiver from "archiver";
import type { Event } from "@prisma/client";
import { formatEventDate, type AppLocale } from "@/lib/dates";
import { db } from "@/server/db";
import { storage } from "@/server/media/storage";
import { wishesPdf } from "./wishes-pdf";
import { wishesCsv, zipEntryName } from "./zip";

export async function eventWishesPdf(event: Event, locale: AppLocale): Promise<Buffer> {
  const wishes = await db.wish.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } });
  return wishesPdf({
    hostNames: event.hostNames,
    title: event.title,
    dateText: formatEventDate(event.startsAt, locale),
    themeColor: event.themeColor,
    locale,
    wishes,
  });
}

/** A ZIP stream: every original upload in its folder, plus the wishes as PDF and CSV. Built on the fly, never stored. */
export async function eventZipStream(event: Event, locale: AppLocale): Promise<ReadableStream<Uint8Array>> {
  const [uploads, wishes, pdf] = await Promise.all([
    db.upload.findMany({ where: { eventId: event.id, status: "READY" }, orderBy: { createdAt: "asc" } }),
    db.wish.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } }),
    eventWishesPdf(event, locale),
  ]);

  // Photos and videos are already compressed; storing them is faster and barely bigger.
  const archive = archiver("zip", { store: true });
  archive.on("warning", (error) => console.warn("[export] zip warning", error.message));
  archive.on("error", (error) => console.error("[export] zip error", error));

  const store = storage();
  const used = new Set<string>();
  for (const upload of uploads) {
    if (!(await store.stat(upload.objectKey))) continue;
    archive.append(createReadStream(store.pathFor(upload.objectKey)), { name: zipEntryName(upload, used), date: upload.createdAt });
  }
  archive.append(pdf, { name: "ucapan.pdf" });
  archive.append(wishesCsv(wishes), { name: "ucapan.csv" });
  void archive.finalize();
  return Readable.toWeb(archive) as ReadableStream<Uint8Array>;
}