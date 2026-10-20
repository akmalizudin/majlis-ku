import "server-only";
import type { Event, Guest } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";

export const wishSchema = z.object({
  message: z
    .string()
    .transform((value) => value.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(1).max(1000)),
});

export async function createWish({ event, guest, message }: { event: Event; guest: Guest; message: string }) {
  return db.wish.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      guestName: guest.displayName,
      message,
      moderation: event.requireApproval ? "PENDING_APPROVAL" : "VISIBLE",
    },
  });
}