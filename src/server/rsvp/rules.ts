import { z } from "zod";
import { phoneSchema } from "@/lib/schemas/card";

/** The RSVP form schema for one card's settings (pax limit, phone asked or not). */
export function rsvpInputSchema({ maxPax, askPhone }: { maxPax: number; askPhone: boolean }) {
  return z
    .object({
      name: z
        .string()
        .transform((value) => value.replace(/\s+/g, " ").trim())
        .pipe(z.string().min(1).max(80)),
      attending: z.boolean(),
      pax: z.number().int().min(0).max(maxPax),
      phone: z
        .string()
        .trim()
        .optional()
        .nullable()
        .transform((value) => (value ? value : null)),
      message: z
        .string()
        .trim()
        .max(500)
        .optional()
        .nullable()
        .transform((value) => (value ? value : null)),
    })
    .superRefine((value, ctx) => {
      if (value.attending && value.pax < 1) ctx.addIssue({ code: "custom", path: ["pax"], message: "At least 1" });
      if (askPhone && value.phone && !phoneSchema.safeParse(value.phone).success) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Invalid phone" });
      }
    })
    .transform((value) => ({
      ...value,
      pax: value.attending ? value.pax : 0,
      phone: askPhone ? value.phone : null,
    }));
}

/** Open while RSVP is on and until the end of the deadline day, Malaysia time (UTC+8). */
export function rsvpOpen(card: { rsvpEnabled: boolean; rsvpDeadline: string | null }, now = new Date()): boolean {
  if (!card.rsvpEnabled) return false;
  if (!card.rsvpDeadline) return true;
  const endOfDayKl = new Date(`${card.rsvpDeadline}T23:59:59.999+08:00`);
  return now.getTime() <= endOfDayKl.getTime();
}

export function rsvpTotals(rows: { attending: boolean; pax: number }[]) {
  const attendingRows = rows.filter((r) => r.attending);
  return {
    replies: rows.length,
    attending: attendingRows.length,
    pax: attendingRows.reduce((sum, r) => sum + r.pax, 0),
    declined: rows.length - attendingRows.length,
  };
}