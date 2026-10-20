"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { deleteEventCompletely, inviteCohost, removeCohost } from "@/server/events/members";
import { getEventForMember } from "@/server/events/service";
import { canDeleteEvent, canManageMembers, canModerate } from "./rules";
import { approveAll, moderateItem } from "./service";

const itemSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(["upload", "wish"]),
  id: z.string().min(1),
  action: z.enum(["approve", "hide", "show", "delete"]),
});

async function memberEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getEventForMember(eventId, session.user);
}

export async function moderateItemAction(input: z.input<typeof itemSchema>): Promise<{ ok: boolean }> {
  const { eventId, type, id, action } = itemSchema.parse(input);
  const event = await memberEvent(eventId);
  if (!event || !canModerate(event.memberRole)) return { ok: false };
  const ok = await moderateItem(event.id, type, id, action);
  revalidatePath("/", "layout");
  return { ok };
}

export async function approveAllAction(eventId: string): Promise<{ count: number }> {
  const event = await memberEvent(z.string().min(1).parse(eventId));
  if (!event || !canModerate(event.memberRole)) return { count: 0 };
  const count = await approveAll(event.id);
  revalidatePath("/", "layout");
  return { count };
}

export type MemberFormState = { error?: "invalid_email" | "already_member" | "forbidden"; saved?: boolean };

export async function inviteCohostAction(eventId: string, _prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const event = await memberEvent(eventId);
  if (!event || !canManageMembers(event.memberRole)) return { error: "forbidden" };
  const result = await inviteCohost(event.id, String(formData.get("email") ?? ""));
  if (!result.ok) return { error: result.code };
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function removeCohostAction(eventId: string, userId: string): Promise<void> {
  const event = await memberEvent(eventId);
  if (!event || !canManageMembers(event.memberRole)) return;
  await removeCohost(event.id, userId);
  revalidatePath("/", "layout");
}

export type DeleteFormState = { error?: "confirm" | "has_payments" | "forbidden" };

export async function deleteEventAction(locale: Locale, eventId: string, _prev: DeleteFormState, formData: FormData): Promise<DeleteFormState> {
  const event = await memberEvent(eventId);
  if (!event || !canDeleteEvent(event.memberRole)) return { error: "forbidden" };
  if (String(formData.get("confirm") ?? "").trim() !== event.slug) return { error: "confirm" };
  const result = await deleteEventCompletely(event.id);
  if (!result.ok) return { error: result.code };
  revalidatePath("/", "layout");
  return redirect({ href: "/dashboard", locale });
}