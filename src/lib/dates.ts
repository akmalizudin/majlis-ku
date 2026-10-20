// Times are stored in UTC and shown in Asia/Kuala_Lumpur. Malaysia has no daylight saving,
// so the offset is always +08:00.

export const EVENT_TIMEZONE = "Asia/Kuala_Lumpur";
const KL_OFFSET_MS = 8 * 60 * 60 * 1000;

export type AppLocale = "ms" | "en";

const intlLocale: Record<AppLocale, string> = { ms: "ms-MY", en: "en-GB" };

export function formatEventDate(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: EVENT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatEventDay(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: EVENT_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "2026-11-14T10:00" (Kuala Lumpur wall-clock, as from <input type="datetime-local">) to a UTC Date. */
export function klLocalToUtc(local: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new RangeError(`Expected YYYY-MM-DDTHH:mm, got ${local}`);
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const date = new Date(asUtc - KL_OFFSET_MS);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid date ${local}`);
  return date;
}

/** A UTC Date to "YYYY-MM-DDTHH:mm" in Kuala Lumpur wall-clock time. */
export function utcToKlLocal(date: Date): string {
  return new Date(date.getTime() + KL_OFFSET_MS).toISOString().slice(0, 16);
}
