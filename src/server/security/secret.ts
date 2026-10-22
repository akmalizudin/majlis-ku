import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time secret check: hashing first makes both sides the same length. False for missing input. */
export function secretMatches(given: string | null | undefined, expected: string): boolean {
  if (!given || !expected) return false;
  return timingSafeEqual(sha256(given), sha256(expected));
}
