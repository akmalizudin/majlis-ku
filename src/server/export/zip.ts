import type { ModerationState, UploadKind } from "@prisma/client";
import { utcToKlLocal } from "@/lib/dates";

const FOLDER: Record<UploadKind, string> = { PHOTO: "gambar", VIDEO: "video", VOICE: "suara" };
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

/** "gambar/Mak Cik Kiah-<id>.jpg", unique within one archive. */
export function zipEntryName(upload: { id: string; kind: UploadKind; guestName: string; mimeType: string }, used: Set<string>): string {
  const name = upload.guestName.replace(/[^\p{L}\p{N} _-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40) || "tetamu";
  const ext = EXT[upload.mimeType.split(";")[0]!.trim()] ?? "bin";
  let entry = `${FOLDER[upload.kind]}/${name}-${upload.id}.${ext}`;
  for (let n = 2; used.has(entry); n++) entry = `${FOLDER[upload.kind]}/${name}-${upload.id}-${n}.${ext}`;
  used.add(entry);
  return entry;
}

function cell(value: string): string {
  // Spreadsheets run cells starting with these as formulas; a leading apostrophe makes them text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csv(rows: string[][]): string {
  // BOM so Excel opens UTF-8 (Malay accents, Arabic, Chinese names) correctly.
  return `﻿${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
}

export function wishesCsv(wishes: { guestName: string; message: string; createdAt: Date; moderation: ModerationState }[]): string {
  return csv([
    ["Nama", "Ucapan", "Masa", "Status"],
    ...wishes.map((w) => [w.guestName, w.message, utcToKlLocal(w.createdAt).replace("T", " "), w.moderation]),
  ]);
}