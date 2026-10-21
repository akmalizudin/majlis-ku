"use server";

import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { formFields } from "@/lib/schemas/admin";
import { reportSchema, reportSlugSchema } from "@/lib/schemas/report";
import { findGuestEvent } from "@/server/guests/context";
import { clientIpHash } from "@/server/http";
import { limiters } from "@/server/security/rate-limit";
import { createReport } from "./service";

/** Plain <form action>: works without JavaScript. Never log what the reporter wrote. */
export async function submitReportAction(locale: Locale, slug: string, formData: FormData): Promise<void> {
  // Bound arguments arrive from the client too, so check them before they reach a redirect.
  if (!hasLocale(routing.locales, locale) || !reportSlugSchema.safeParse(slug).success) notFound();
  const to = (query: string) => redirect({ href: `/${slug}/report?${query}`, locale });
  // Counted before validation, so bad submissions use up the allowance too.
  if (!limiters.report.hit(await clientIpHash()).ok) return to("error=rate_limited");
  const event = await findGuestEvent(slug);
  if (!event) notFound();
  const parsed = reportSchema.safeParse(formFields(formData, ["reason", "details"]));
  if (!parsed.success) return to("error=validation");
  await createReport(event.id, parsed.data);
  return to("sent=1");
}
