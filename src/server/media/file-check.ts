import type { UploadKind } from "@prisma/client";
import { fileTypeFromBuffer } from "file-type";

/** Types we accept per kind. Checked against the declared type and again against the real bytes. */
export const ALLOWED_MIME: Record<UploadKind, readonly string[]> = {
  PHOTO: ["image/jpeg", "image/png", "image/webp"],
  VIDEO: ["video/mp4", "video/quicktime", "video/webm"],
  VOICE: ["audio/webm", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/mpeg", "audio/wav", "audio/x-wav", "video/webm"],
};

/** How many bytes of a file we read to detect its type. */
export const SNIFF_BYTES = 4100;

export function baseMime(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase();
}

export function isAllowedMime(kind: UploadKind, mime: string): boolean {
  return ALLOWED_MIME[kind].includes(baseMime(mime));
}

/** The real type from the file's magic bytes, or null if unknown. */
export async function detectMime(head: Uint8Array): Promise<string | null> {
  const result = await fileTypeFromBuffer(head);
  return result?.mime ?? null;
}

/**
 * Browsers record voice in WebM or MP4 containers that magic bytes report as video; for a voice
 * upload, an audio-only container is still a valid voice note.
 */
export function detectedMatchesKind(kind: UploadKind, detected: string | null): boolean {
  if (!detected) return false;
  if (kind === "VOICE" && (detected === "video/webm" || detected === "video/mp4")) return true;
  if (kind === "VOICE" && detected === "audio/x-m4a") return true;
  return isAllowedMime(kind, detected);
}