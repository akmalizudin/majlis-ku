import "server-only";
import { ApiError } from "@/server/http";
import { readGuestContext } from "./context";

/** For guest API routes: the event and the guest on this device, or an ApiError. */
export async function requireGuest(slug: string) {
  const context = await readGuestContext(slug);
  if (!context) throw new ApiError("not_found", 404);
  if (!context.pinOk) throw new ApiError("pin_required", 403);
  if (!context.guest || !context.deviceHash) throw new ApiError("not_guest", 401);
  return { event: context.event, guest: context.guest, deviceHash: context.deviceHash };
}