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