import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalStorageDriver } from "@/server/media/local-storage";

let dir: string;
let storage: LocalStorageDriver;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "majlis-media-"));
  storage = new LocalStorageDriver(dir, "test-secret-test-secret");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("LocalStorageDriver", () => {
  it("puts, stats, reads the head of, and deletes an object", async () => {
    await storage.putObject("events/e1/u1/original", Buffer.from("hello world"), "text/plain");
    expect(await storage.stat("events/e1/u1/original")).toEqual({ size: 11 });
    expect((await storage.readHead("events/e1/u1/original", 5)).toString()).toBe("hello");
    expect((await storage.getObject("events/e1/u1/original")).toString()).toBe("hello world");
    await storage.deleteObject("events/e1/u1/original");
    expect(await storage.stat("events/e1/u1/original")).toBeNull();
  });

  it("deletes everything under a prefix", async () => {
    await storage.putObject("events/e2/a/original", Buffer.from("a"), "text/plain");
    await storage.putObject("events/e2/b/original", Buffer.from("b"), "text/plain");
    await storage.deletePrefix("events/e2/");
    expect(await storage.stat("events/e2/a/original")).toBeNull();
    expect(await storage.stat("events/e2/b/original")).toBeNull();
  });

  it("issues signed upload and download URLs", async () => {
    const upload = await storage.createUploadUrl("events/e3/u/original", { contentType: "image/jpeg", maxBytes: 100, expiresInSec: 60 });
    expect(upload.method).toBe("PUT");
    expect(upload.url).toContain("/api/storage/upload?");
    expect(await storage.getDownloadUrl("events/e3/u/thumb.webp", { expiresInSec: 60 })).toContain("/api/storage/file?");
  });

  it("refuses keys outside the media folder", async () => {
    await expect(storage.putObject("../escape", Buffer.from("x"), "text/plain")).rejects.toThrow();
  });
});