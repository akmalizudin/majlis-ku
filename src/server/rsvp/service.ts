import "server-only";
import type { Rsvp } from "@prisma/client";
import { db } from "@/server/db";

export type RsvpInput = { name: string; attending: boolean; pax: number; phone: string | null; message: string | null };

/** One reply per device: sending again updates the earlier answer. */
export async function submitRsvp(eventId: string, deviceHash: string, input: RsvpInput): Promise<Rsvp> {
  const existing = await db.rsvp.findFirst({ where: { eventId, deviceTokenHash: deviceHash } });
  if (existing) return db.rsvp.update({ where: { id: existing.id }, data: input });
  return db.rsvp.create({ data: { ...input, eventId, deviceTokenHash: deviceHash } });
}

export async function findMyRsvp(eventId: string, deviceHash: string | null): Promise<Rsvp | null> {
  if (!deviceHash) return null;
  return db.rsvp.findFirst({ where: { eventId, deviceTokenHash: deviceHash } });
}

export async function listRsvps(eventId: string, filter: "all" | "yes" | "no" = "all") {
  return db.rsvp.findMany({
    where: { eventId, ...(filter === "yes" ? { attending: true } : filter === "no" ? { attending: false } : {}) },
    orderBy: { updatedAt: "desc" },
  });
}