"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { eventFormSchema, eventSettingsSchema, formToObject } from "@/lib/schemas/event";
import { requireUser } from "@/server/auth/session";
import { canEditEvent } from "@/server/moderation/rules";
import { createEvent, getEventForMember, updateEvent, updateEventSettings } from "./service";

export type FormState = { errors?: string[]; saved?: boolean };

function fieldNames(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "form")))];
}

export async function createEventAction(locale: Locale, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(locale);
  const parsed = eventFormSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldNames(parsed.error) };
  const event = await createEvent(user.id, parsed.data);
  return redirect({ href: `/dashboard/events/${event.id}`, locale });
}

export async function updateEventAction(locale: Locale, eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(locale);
  const event = await getEventForMember(eventId, user);
  if (!event || !canEditEvent(event.memberRole)) return { errors: ["form"] };
  const parsed = eventFormSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldNames(parsed.error) };
  await updateEvent(eventId, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function updateSettingsAction(locale: Locale, eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(locale);
  const event = await getEventForMember(eventId, user);
  if (!event || !canEditEvent(event.memberRole)) return { errors: ["form"] };
  const raw = formToObject(formData);
  const parsed = eventSettingsSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldNames(parsed.error) };
  await updateEventSettings(eventId, { ...parsed.data, clearPin: raw.clearPin === "on" });
  revalidatePath("/", "layout");
  return { saved: true };
}