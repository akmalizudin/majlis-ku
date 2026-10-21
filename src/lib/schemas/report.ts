import { z } from "zod";

export const REPORT_REASONS = ["SEXUAL", "VIOLENCE", "HATE", "SCAM", "PRIVACY", "COPYRIGHT", "OTHER"] as const;

// Same alphabet as real event slugs (src/server/events/slug.ts); no "/" or "." so it can never form a redirect.
export const reportSlugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export const reportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS),
    details: z
      .string()
      .transform((value) => value.replace(/\r\n/g, "\n")) // browsers submit textarea newlines as CRLF
      .pipe(z.string().trim().max(1000))
      .optional()
      .transform((value) => value || null),
  })
  .strict();

export type ReportInput = z.output<typeof reportSchema>;
