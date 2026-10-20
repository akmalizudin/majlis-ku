// Object keys: events/<eventId>/<uploadId>/<variant>. Only these characters are ever accepted.
const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/i;

export function assertSafeKey(key: string): string {
  if (!KEY_PATTERN.test(key) || key.includes("..") || key.length > 300) {
    throw new RangeError(`Unsafe storage key: ${key}`);
  }
  return key;
}

export type MediaVariant = "original" | "display.jpg" | "thumb.webp" | "display.m4a" | "display.mp4" | "poster.jpg";

export function uploadKey(eventId: string, uploadId: string, variant: MediaVariant): string {
  return assertSafeKey(`events/${eventId}/${uploadId}/${variant}`);
}

export function coverKey(eventId: string, version: string): string {
  return assertSafeKey(`events/${eventId}/cover/${version}.jpg`);
}

export function eventPrefix(eventId: string): string {
  return `${assertSafeKey(`events/${eventId}`)}/`;
}