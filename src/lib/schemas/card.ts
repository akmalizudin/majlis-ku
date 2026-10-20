import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

/** Malaysian or international phone: digits with optional +, spaces, dashes or brackets; 8 to 15 digits. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s\-()]{8,20}$/, { message: "Invalid phone" })
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 8 && digits <= 15;
  }, { message: "Invalid phone" });

const scheduleRow = z.object({ time: z.string().trim().regex(/^\d{1,2}[:.]\d{2}$/), label: text(80).min(1) });
const contact = z.object({ name: text(60).min(1), phone: phoneSchema });

/** What is stored in ECard.content. Event details (date, venue, maps) come from the Event itself. */
export const cardContentSchema = z.object({
  headline: text(80),
  intro: text(400),
  hostLine: text(200),
  names: text(120),
  note: text(500),
  schedule: z.array(scheduleRow).max(6),
  contacts: z.array(contact).max(3),
  photoKeys: z.array(z.string().max(300)).max(3),
  showGuestbook: z.boolean(),
  rsvpEnabled: z.boolean(),
  rsvpDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  maxPax: z.number().int().min(1).max(20),
  askPhone: z.boolean(),
});

export type CardContent = z.output<typeof cardContentSchema>;

export const DEFAULT_CARD: CardContent = {
  headline: "Walimatulurus",
  intro: "Dengan segala hormatnya kami mempersilakan Dato' / Datin / Tuan / Puan / Encik / Cik ke majlis kami",
  hostLine: "",
  names: "",
  note: "",
  schedule: [],
  contacts: [],
  photoKeys: [],
  showGuestbook: true,
  rsvpEnabled: true,
  rsvpDeadline: null,
  maxPax: 5,
  askPhone: false,
};

/** What the builder sends: the content plus the template and the published switch. */
export const cardInputSchema = cardContentSchema
  .extend({
    templateId: z.string().min(1),
    published: z.boolean(),
    rsvpDeadline: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/)
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  .strict();

export type CardInput = z.output<typeof cardInputSchema>;

/** Stored JSON to content; anything unreadable falls back to the defaults. */
export function parseCardContent(json: unknown): CardContent {
  const result = cardContentSchema.safeParse(json);
  return result.success ? result.data : DEFAULT_CARD;
}

/** wa.me link for a Malaysian (or international) number. */
export function whatsappLink(phone: string, text?: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `6${digits}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}