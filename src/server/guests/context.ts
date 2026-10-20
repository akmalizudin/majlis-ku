import "server-only";
import type { Event, Guest, Plan } from "@prisma/client";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { storageSecret } from "@/server/media/storage";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE, hashDeviceToken, newDeviceToken } from "./identity";
import { pinCookieName, verifyPinPass } from "./pin";

export type GuestContext = {
  event: Event & { plan: Plan };
  deviceHash: string | null;
  guest: Guest | null;
  pinOk: boolean;
};

/** A guest-visible event: active (not draft or archived). */
export async function findGuestEvent(slug: string) {
  const event = await db.event.findUnique({ where: { slug }, include: { plan: true } });
  return event && event.status === "ACTIVE" ? event : null;
}

/** Read-only: who is this device for this event? Safe to call from Server Components. */
export async function readGuestContext(slug: string): Promise<GuestContext | null> {
  const event = await findGuestEvent(slug);
  if (!event) return null;
  const jar = await cookies();
  const token = jar.get(DEVICE_COOKIE)?.value;
  const deviceHash = token ? hashDeviceToken(token, env().HASH_SALT) : null;
  const pinOk =
    !event.pinHash || (deviceHash !== null && verifyPinPass(jar.get(pinCookieName(event.id))?.value, event.id, deviceHash, storageSecret()));
  const guest = deviceHash
    ? await db.guest.findUnique({ where: { eventId_deviceTokenHash: { eventId: event.id, deviceTokenHash: deviceHash } } })
    : null;
  return { event, deviceHash, guest, pinOk };
}

/** Route handlers only: the device hash, setting a new device cookie if there is none. */
export async function ensureDeviceHash(): Promise<string> {
  const jar = await cookies();
  let token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) {
    token = newDeviceToken();
    jar.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && env().NEXT_PUBLIC_APP_URL.startsWith("https://"),
      path: "/",
      maxAge: DEVICE_COOKIE_MAX_AGE,
    });
  }
  return hashDeviceToken(token, env().HASH_SALT);
}