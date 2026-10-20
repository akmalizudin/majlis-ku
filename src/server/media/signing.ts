import { createHmac, timingSafeEqual } from "node:crypto";
import { assertSafeKey } from "./keys";

// Signed URLs for the local storage driver, shaped like S3 presigned URLs so the browser code
// does not care which driver is behind them.

export type StorageAction = "put" | "get";

const PATHS: Record<StorageAction, string> = {
  put: "/api/storage/upload",
  get: "/api/storage/file",
};

function signature(secret: string, parts: string[]): string {
  return createHmac("sha256", secret).update(parts.join("\n")).digest("base64url");
}

export function signStorageUrl({
  action,
  key,
  expiresInSec,
  maxBytes,
  filename,
  secret,
  now = new Date(),
}: {
  action: StorageAction;
  key: string;
  expiresInSec: number;
  maxBytes?: number;
  filename?: string;
  secret: string;
  now?: Date;
}): string {
  assertSafeKey(key);
  const exp = String(Math.floor(now.getTime() / 1000) + expiresInSec);
  const max = maxBytes === undefined ? "" : String(maxBytes);
  const name = filename ?? "";
  const params = new URLSearchParams({ key, exp });
  if (max) params.set("max", max);
  if (name) params.set("name", name);
  params.set("sig", signature(secret, [action, key, exp, max, name]));
  return `${PATHS[action]}?${params.toString()}`;
}

export type VerifyResult =
  | { ok: true; key: string; maxBytes?: number; filename?: string }
  | { ok: false; code: "bad_signature" | "expired" };

export function verifyStorageParams(
  action: StorageAction,
  params: Record<string, string | undefined>,
  secret: string,
  now = new Date(),
): VerifyResult {
  const { key = "", exp = "", max = "", name = "", sig = "" } = params;
  const expected = Buffer.from(signature(secret, [action, key, exp, max, name]));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, code: "bad_signature" };
  try {
    assertSafeKey(key);
  } catch {
    return { ok: false, code: "bad_signature" };
  }
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 < now.getTime()) return { ok: false, code: "expired" };
  return {
    ok: true,
    key,
    ...(max ? { maxBytes: Number(max) } : {}),
    ...(name ? { filename: name } : {}),
  };
}