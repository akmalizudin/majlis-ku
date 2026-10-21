import "server-only";
import { randomBytes } from "node:crypto";
import type { Event, Plan, Prisma } from "@prisma/client";
import { parseCardContent, type CardContent, type CardInput } from "@/lib/schemas/card";
import { db } from "@/server/db";
import { findGuestEvent } from "@/server/guests/context";
import { ApiError } from "@/server/http";
import { detectMime, isAllowedMime, SNIFF_BYTES } from "@/server/media/file-check";
import { processCover } from "@/server/media/images";
import { assertSafeKey } from "@/server/media/keys";
import { MEDIA_URL_TTL_SEC, storage } from "@/server/media/storage";
import { KIND_MAX_BYTES } from "@/server/plans/limits";
import { templateStyle, templateUsable } from "./templates";

const MAX_PHOTOS = 3;
const MUSIC_MAX_BYTES = 10 * 1024 * 1024;
const MUSIC_TYPES: Record<string, string> = { "audio/mpeg": "mp3", "audio/x-m4a": "m4a", "audio/mp4": "m4a", "video/mp4": "m4a" };

const cardPrefix = (eventId: string) => `events/${eventId}/card/`;

export async function listTemplates() {
  const templates = await db.template.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return templates.map((t) => ({ ...t, style: templateStyle(t.defaults) }));
}

export async function getCard(eventId: string) {
  const card = await db.eCard.findUnique({ where: { eventId }, include: { template: true } });
  return card ? { ...card, content: parseCardContent(card.content), style: templateStyle(card.template.defaults) } : null;
}

/** The card row, created with the first template and default content if it does not exist yet. */
async function ensureCard(eventId: string) {
  const existing = await db.eCard.findUnique({ where: { eventId } });
  if (existing) return existing;
  const template = await db.template.findFirstOrThrow({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  const content: CardContent = { ...parseCardContent(null), names: event.hostNames, headline: event.title };
  return db.eCard.create({ data: { eventId, templateId: template.id, content: content as Prisma.InputJsonObject } });
}

export async function saveCard(eventId: string, input: CardInput) {
  // Check before ensureCard so a rejected save never creates a card row.
  const existing = await db.eCard.findUnique({ where: { eventId } });
  const template = await db.template.findUnique({ where: { id: input.templateId } });
  if (!templateUsable(template, existing?.templateId ?? null)) throw new ApiError("invalid_template", 400);
  const card = await ensureCard(eventId);
  const stored = parseCardContent(card.content);
  const { templateId, published, ...content } = input;
  // Photos are added and removed only through their own routes, so a stale builder can never drop or invent one.
  const photoKeys = stored.photoKeys;
  return db.eCard.update({
    where: { eventId },
    data: {
      templateId,
      content: { ...content, photoKeys } as Prisma.InputJsonObject,
      published,
      publishedAt: published ? (card.publishedAt ?? new Date()) : null,
    },
  });
}

export async function addCardPhoto(eventId: string, file: File) {
  const card = await ensureCard(eventId);
  const content = parseCardContent(card.content);
  if (content.photoKeys.length >= MAX_PHOTOS) throw new ApiError("too_many_photos", 409);
  if (file.size === 0 || file.size > Number(KIND_MAX_BYTES.PHOTO)) throw new ApiError("too_large", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = await detectMime(bytes.subarray(0, SNIFF_BYTES));
  if (!detected || !isAllowedMime("PHOTO", detected)) throw new ApiError("invalid_type", 415);
  let photo: Buffer;
  try {
    photo = await processCover(bytes);
  } catch {
    throw new ApiError("invalid_file", 422);
  }
  const key = assertSafeKey(`${cardPrefix(eventId)}${randomBytes(8).toString("hex")}.jpg`);
  await storage().putObject(key, photo, "image/jpeg");
  await db.eCard.update({
    where: { eventId },
    data: { content: { ...content, photoKeys: [...content.photoKeys, key] } as Prisma.InputJsonObject },
  });
  return key;
}

export async function removeCardPhoto(eventId: string, key: string) {
  const card = await db.eCard.findUnique({ where: { eventId } });
  if (!card) return;
  const content = parseCardContent(card.content);
  if (!content.photoKeys.includes(key)) return;
  await storage().deleteObject(key);
  await db.eCard.update({
    where: { eventId },
    data: { content: { ...content, photoKeys: content.photoKeys.filter((k) => k !== key) } as Prisma.InputJsonObject },
  });
}

export async function setCardMusic(eventId: string, file: File) {
  const card = await ensureCard(eventId);
  if (file.size === 0 || file.size > MUSIC_MAX_BYTES) throw new ApiError("too_large", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = await detectMime(bytes.subarray(0, SNIFF_BYTES));
  const ext = detected ? MUSIC_TYPES[detected] : undefined;
  if (!ext) throw new ApiError("invalid_type", 415);
  const key = assertSafeKey(`${cardPrefix(eventId)}music-${randomBytes(4).toString("hex")}.${ext}`);
  await storage().putObject(key, bytes, ext === "mp3" ? "audio/mpeg" : "audio/mp4");
  if (card.musicKey) await storage().deleteObject(card.musicKey);
  await db.eCard.update({ where: { eventId }, data: { musicKey: key } });
}

export async function removeCardMusic(eventId: string) {
  const card = await db.eCard.findUnique({ where: { eventId } });
  if (!card?.musicKey) return;
  await storage().deleteObject(card.musicKey);
  await db.eCard.update({ where: { eventId }, data: { musicKey: null } });
}

export type PublicCard = NonNullable<Awaited<ReturnType<typeof findPublicCard>>>;

/** A published card on a plan that includes the e-card, for the public invitation page. */
export async function findPublicCard(slug: string) {
  const event = await findGuestEvent(slug);
  if (!event || !event.plan.includesEcard) return null;
  const card = await getCard(event.id);
  if (!card?.published) return null;
  return { event, card };
}

export async function signedCardMedia(card: { content: CardContent; musicKey: string | null }) {
  const store = storage();
  const [photos, music] = await Promise.all([
    Promise.all(card.content.photoKeys.map((key) => store.getDownloadUrl(key, { expiresInSec: MEDIA_URL_TTL_SEC }))),
    card.musicKey ? store.getDownloadUrl(card.musicKey, { expiresInSec: MEDIA_URL_TTL_SEC }) : Promise.resolve(null),
  ]);
  return { photos, music };
}

export function planHasCard(event: Event & { plan: Plan }): boolean {
  return event.plan.includesEcard;
}