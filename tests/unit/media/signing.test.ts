import { describe, expect, it } from "vitest";
import { signStorageUrl, verifyStorageParams } from "@/server/media/signing";

const secret = "test-secret-test-secret";
const now = new Date("2026-10-20T10:00:00Z");

function params(url: string) {
  return Object.fromEntries(new URL(url, "http://x").searchParams);
}

describe("storage URL signing", () => {
  it("round-trips a signed upload URL", () => {
    const url = signStorageUrl({ action: "put", key: "events/e1/u1/original", expiresInSec: 600, maxBytes: 1000, secret, now });
    expect(url.startsWith("/api/storage/upload?")).toBe(true);
    expect(verifyStorageParams("put", params(url), secret, now)).toEqual({ ok: true, key: "events/e1/u1/original", maxBytes: 1000 });
  });

  it("round-trips a signed download URL with a file name", () => {
    const url = signStorageUrl({ action: "get", key: "events/e1/u1/thumb.webp", expiresInSec: 600, secret, now, filename: "a.jpg" });
    expect(url.startsWith("/api/storage/file?")).toBe(true);
    expect(verifyStorageParams("get", params(url), secret, now)).toMatchObject({ ok: true, filename: "a.jpg" });
  });

  it("rejects an expired URL", () => {
    const url = signStorageUrl({ action: "get", key: "k", expiresInSec: 60, secret, now });
    const later = new Date(now.getTime() + 61_000);
    expect(verifyStorageParams("get", params(url), secret, later)).toEqual({ ok: false, code: "expired" });
  });

  it("rejects a tampered key, size, action or secret", () => {
    const url = signStorageUrl({ action: "put", key: "events/e1/u1/original", expiresInSec: 600, maxBytes: 1000, secret, now });
    const p = params(url);
    expect(verifyStorageParams("put", { ...p, key: "events/e2/u1/original" }, secret, now)).toEqual({ ok: false, code: "bad_signature" });
    expect(verifyStorageParams("put", { ...p, max: "999999" }, secret, now)).toEqual({ ok: false, code: "bad_signature" });
    expect(verifyStorageParams("get", p, secret, now)).toEqual({ ok: false, code: "bad_signature" });
    expect(verifyStorageParams("put", p, "other-secret-other", now)).toEqual({ ok: false, code: "bad_signature" });
  });

  it("rejects keys that try to leave the media folder", () => {
    expect(() => signStorageUrl({ action: "get", key: "../etc/passwd", expiresInSec: 60, secret, now })).toThrow();
  });
});