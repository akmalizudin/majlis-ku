const DAY_MS = 24 * 60 * 60 * 1000;

/** Media is kept for the plan's retention period, counted from the event date (or now, if that has passed). */
export function computePurgeAt({
  startsAt,
  retentionDays,
  now = new Date(),
}: {
  startsAt: Date;
  retentionDays: number;
  now?: Date;
}): Date {
  if (!Number.isInteger(retentionDays) || retentionDays < 0) {
    throw new RangeError(`Invalid retention: ${retentionDays}`);
  }
  const from = Math.max(startsAt.getTime(), now.getTime());
  return new Date(from + retentionDays * DAY_MS);
}

/** A host edit moves purgeAt only when the event date changes; an unchanged date keeps the stored value. */
export function nextPurgeAt(
  current: { startsAt: Date; purgeAt: Date | null },
  nextStartsAt: Date,
  retentionDays: number,
  now = new Date(),
): Date | null {
  if (current.startsAt.getTime() === nextStartsAt.getTime()) return current.purgeAt;
  return computePurgeAt({ startsAt: nextStartsAt, retentionDays, now });
}
