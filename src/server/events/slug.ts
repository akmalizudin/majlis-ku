import { randomInt } from "node:crypto";

// Words that are app routes under /[locale]/ and must never become an event slug.
export const RESERVED_SLUGS = new Set([
  "dashboard",
  "admin",
  "signin",
  "api",
  "en",
  "ms",
  "i",
  "slideshow",
  "privacy",
  "terms",
  "about",
  "help",
  "_next",
]);

const MAX_BASE = 40;
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o/1/l, easier to read off a printed card

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE)
    .replace(/-+$/g, "");
  return base || "majlis";
}

function suffix(length = 5): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function makeSlug(hostNames: string): string {
  return `${slugify(hostNames)}-${suffix()}`;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}