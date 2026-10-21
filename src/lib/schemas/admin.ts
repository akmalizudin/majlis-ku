import { z } from "zod";
import { parseRinggit } from "@/lib/money";

const MB = BigInt(1024 * 1024);
const MAX_PRICE_SEN = 1_000_000; // RM 10,000

/**
 * Named form fields only, so Next.js `$ACTION_*` keys never reach a strict schema.
 * Missing names are omitted (an unchecked checkbox sends nothing).
 */
export function formFields(formData: FormData, names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value === "string") out[name] = value;
  }
  return out;
}

/** Absent or "" is false; "on" or "true" is true. */
const checkbox = z
  .enum(["on", "true", ""])
  .optional()
  .transform((value) => value === "on" || value === "true");

const int = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

/** Blank (or absent) is null, otherwise an integer in range. */
const optionalInt = (min: number, max: number) =>
  z
    .string()
    .optional()
    .default("")
    .pipe(z.string().trim())
    .pipe(z.union([z.literal("").transform(() => null), int(min, max)]));

const ringgit = z.string().transform((value, ctx) => {
  try {
    const sen = parseRinggit(value);
    if (sen <= MAX_PRICE_SEN) return sen;
  } catch {
    // parseRinggit throws RangeError; report it as an issue instead
  }
  ctx.addIssue({ code: "custom", message: "Price must be RM 0 to RM 10,000" });
  return z.NEVER;
});

const name = z.string().trim().min(1).max(60);

export const planFormSchema = z
  .object({
    nameMs: name,
    nameEn: name,
    price: ringgit,
    uploadLimit: optionalInt(0, 100_000),
    videoAllowed: checkbox,
    maxVideoSeconds: optionalInt(1, 600),
    maxUploadMb: int(1, 200),
    storageLimitMb: optionalInt(1, 1_048_576),
    retentionDays: int(1, 3650),
    active: checkbox,
    sortOrder: int(0, 1000),
  })
  .strict()
  .transform(({ price, maxUploadMb, storageLimitMb, ...rest }) => ({
    ...rest,
    priceSen: price,
    maxUploadBytes: BigInt(maxUploadMb) * MB,
    storageLimitBytes: storageLimitMb === null ? null : BigInt(storageLimitMb) * MB,
  }));

export type PlanFormOutput = z.output<typeof planFormSchema>;

export const PLAN_FORM_FIELDS = [
  "nameMs",
  "nameEn",
  "price",
  "uploadLimit",
  "videoAllowed",
  "maxVideoSeconds",
  "maxUploadMb",
  "storageLimitMb",
  "retentionDays",
  "active",
  "sortOrder",
] as const;

const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const templateShape = {
  nameMs: name,
  nameEn: name,
  layout: z.enum(["classic", "modern", "floral"]),
  font: z.enum(["serif", "sans"]),
  primary: colour,
  background: colour,
  accent: colour,
  active: checkbox,
  sortOrder: int(0, 1000),
};

export const templateFormSchema = z.object(templateShape).strict();
export const templateCreateSchema = z
  .object({ code: z.string().regex(/^[a-z0-9-]{3,40}$/), ...templateShape })
  .strict();

export type TemplateFormOutput = z.output<typeof templateFormSchema>;

export const TEMPLATE_FORM_FIELDS = Object.keys(templateShape) as (keyof typeof templateShape)[];

/** The Template.defaults JSON, in the shape templateStyleSchema reads. */
export function templateDefaults(input: Pick<TemplateFormOutput, "layout" | "font" | "primary" | "background" | "accent">) {
  const { layout, font, primary, background, accent } = input;
  return { layout, font, primary, background, accent };
}

export const changePlanSchema = z.object({ planCode: z.enum(["FREE", "ECARD", "PREMIUM"]) }).strict();
export const reportOutcomeSchema = z.object({ outcome: z.enum(["RESOLVED", "DISMISSED"]) }).strict();
export const confirmSlugSchema = z.object({ confirmSlug: z.string().trim().min(1).max(80) }).strict();
