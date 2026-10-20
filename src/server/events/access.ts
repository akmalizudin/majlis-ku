import "server-only";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import type { Locale } from "@/i18n/routing";
import { env } from "@/lib/env";
import { requireUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import { getEventForMember } from "./service";

/** Pages: the event for its owner, co-hosts and admins; 404 for everyone else. */
export async function requireEventMember(locale: Locale, eventId: string) {
  const user = await requireUser(locale);
  const event = await getEventForMember(eventId, user);
  if (!event) notFound();
  return { user, event };
}

/** API routes: same rule, as ApiErrors. */
export async function requireEventMemberApi(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError("unauthorized", 401);
  const event = await getEventForMember(eventId, session.user);
  if (!event) throw new ApiError("not_found", 404);
  return { user: session.user, event };
}

/** The link printed in the QR code and shared on WhatsApp. */
export function eventUrl(slug: string): string {
  return `${env().NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/${slug}`;
}