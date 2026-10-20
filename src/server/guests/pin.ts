import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 32;

export function pinCookieName(eventId: string): string {
  return `mk_pin_${eventId}`;
}

/** "scrypt$<salt>$<hash>", both base64url. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltText, hashText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  const actual = await scrypt(pin, Buffer.from(saltText, "base64url"), expected.length || KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Cookie value proving this device entered the event's PIN. */
export function signPinPass(eventId: string, deviceHash: string, secret: string): string {
  return createHmac("sha256", secret).update(`pin:${eventId}:${deviceHash}`).digest("base64url");
}

export function verifyPinPass(pass: string | undefined, eventId: string, deviceHash: string, secret: string): boolean {
  if (!pass) return false;
  const expected = Buffer.from(signPinPass(eventId, deviceHash, secret));
  const given = Buffer.from(pass);
  return expected.length === given.length && timingSafeEqual(expected, given);
}