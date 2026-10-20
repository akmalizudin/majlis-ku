import { cookies } from "next/headers";
import { z } from "zod";
import { ensureDeviceHash, findGuestEvent } from "@/server/guests/context";
import { pinCookieName, signPinPass, verifyPin } from "@/server/guests/pin";
import { ApiError, handle, readJson } from "@/server/http";
import { storageSecret } from "@/server/media/storage";
import { limiters } from "@/server/security/rate-limit";

const bodySchema = z.object({ pin: z.string().trim().regex(/^\d{4,8}$/) });

export const POST = handle(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const { pin } = await readJson(request, bodySchema);
  const event = await findGuestEvent(slug);
  if (!event) throw new ApiError("not_found", 404);
  const deviceHash = await ensureDeviceHash();
  if (!event.pinHash) return new Response(null, { status: 204 });

  const key = `${event.id}:${deviceHash}`;
  if (!limiters.pinAttempt.hit(key).ok) throw new ApiError("locked", 429);
  if (!(await verifyPin(pin, event.pinHash))) throw new ApiError("invalid_pin", 403);

  limiters.pinAttempt.reset(key);
  (await cookies()).set(pinCookieName(event.id), signPinPass(event.id, deviceHash, storageSecret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return new Response(null, { status: 204 });
});