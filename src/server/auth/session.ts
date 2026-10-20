import "server-only";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { canAccessAdmin } from "./roles";

/** The signed-in host, or a redirect to the sign-in page. */
export async function requireUser(locale: Locale) {
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/signin", locale });
  }
  return session.user;
}

/** The signed-in admin, or null when the user is signed in but not an admin. */
export async function requireAdmin(locale: Locale) {
  const user = await requireUser(locale);
  return canAccessAdmin(user) ? user : null;
}