import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { LocalStorageDriver } from "./local-storage";

/** Key for signing storage URLs, derived from AUTH_SECRET so there is one less secret to manage. */
export function storageSecret(): string {
  return createHash("sha256").update(`storage:${env().AUTH_SECRET}`).digest("base64url");
}

let driver: LocalStorageDriver | undefined;

export function storage(): LocalStorageDriver {
  if (env().STORAGE_DRIVER !== "local") {
    throw new Error("Only STORAGE_DRIVER=local is implemented. An S3/R2 driver comes with hosting.");
  }
  driver ??= new LocalStorageDriver(env().LOCAL_MEDIA_DIR, storageSecret());
  return driver;
}

/** How long signed media URLs stay valid. */
export const MEDIA_URL_TTL_SEC = 60 * 60;
export const UPLOAD_URL_TTL_SEC = 15 * 60;