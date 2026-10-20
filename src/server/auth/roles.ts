import type { UserRole } from "@prisma/client";

export function isAdminEmail(email: string | null | undefined, adminEmails: readonly string[]): boolean {
  if (!email) return false;
  return adminEmails.includes(email.trim().toLowerCase());
}

export function canAccessAdmin(user: { role: UserRole } | null | undefined): boolean {
  return user?.role === "ADMIN";
}
