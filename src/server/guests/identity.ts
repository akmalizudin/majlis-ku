import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

/** httpOnly cookie that identifies a guest's device. Only its salted hash is stored. */
export const DEVICE_COOKIE = "mk_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceToken(token: string, salt: string): string {
  return createHmac("sha256", salt).update(`device:${token}`).digest("hex");
}

export function hashIp(ip: string, salt: string): string {
  return createHmac("sha256", salt).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export const displayNameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1)
      .max(40)
      .refine((value) => !/\p{Cc}/u.test(value), { message: "Invalid characters" }),
  );