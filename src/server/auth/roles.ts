import type { UserRole } from "@prisma/client";

export function isAdminEmail(email: string | null | undefined, adminEmails: readonly string[]): boolean {
  if (!email) return false;
  return adminEmails.includes(email.trim().toLowerCase());
}

/** The ADMIN role alone is not enough: the email must still be in ADMIN_EMAILS, so removing it revokes access. */
export function canAccessAdmin(
  user: { role: UserRole; email?: string | null } | null | undefined,
  adminEmails: readonly string[],
): boolean {
  return user?.role === "ADMIN" && isAdminEmail(user.email, adminEmails);
}
