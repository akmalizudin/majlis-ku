import "server-only";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { canAccessAdmin } from "@/server/auth/roles";

/** The signed-in admin, or null. Checked against ADMIN_EMAILS on every call, so removing an email revokes access. */
export async function requireAdminAction() {
  const user = (await auth())?.user;
  return user && canAccessAdmin(user, env().ADMIN_EMAILS) ? user : null;
}
