"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cardInputSchema } from "@/lib/schemas/card";
import { getEventForMember } from "@/server/events/service";
import { ApiError } from "@/server/http";
import { canModerate } from "@/server/moderation/rules";
import { saveCard } from "./service";

export type SaveCardResult = { ok: true } | { ok: false; error: "validation" | "forbidden" | "not_in_plan" | "invalid_template"; fields?: string[] };

export async function saveCardAction(eventId: string, input: unknown): Promise<SaveCardResult> {
  const session = await auth();
  const event = session?.user?.id ? await getEventForMember(eventId, session.user) : null;
  if (!event || !canModerate(event)) return { ok: false, error: "forbidden" };
  if (!event.plan.includesEcard) return { ok: false, error: "not_in_plan" };
  const parsed = cardInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: [...new Set(parsed.error.issues.map((i) => i.path.join(".")))] };
  }
  try {
    await saveCard(event.id, parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.code === "invalid_template") return { ok: false, error: "invalid_template" };
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}