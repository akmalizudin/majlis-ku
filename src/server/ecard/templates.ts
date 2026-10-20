import { z } from "zod";

/** Template.defaults as stored by the seed (and editable by admins later). */
export const templateStyleSchema = z.object({
  layout: z.enum(["classic", "modern", "floral"]).catch("classic"),
  font: z.enum(["serif", "sans"]).catch("serif"),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch("#7a1f2b"),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch("#fbf3e4"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch("#c9a227"),
});

export type TemplateStyle = z.output<typeof templateStyleSchema>;

export function templateStyle(defaults: unknown): TemplateStyle {
  return templateStyleSchema.parse(typeof defaults === "object" && defaults !== null ? defaults : {});
}