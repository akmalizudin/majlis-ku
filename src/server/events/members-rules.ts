import { z } from "zod";

const emailSchema = z.email().max(254);

/** Lowercased, trimmed email, or null if it is not a valid address. */
export function normalizeInviteEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  return emailSchema.safeParse(email).success ? email : null;
}