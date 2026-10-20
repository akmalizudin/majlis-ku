import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectMime, isAllowedMime } from "@/server/media/file-check";

async function image(format: "jpeg" | "png" | "webp") {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: "#8b5e3c" } })
    .toFormat(format)
    .toBuffer();
}

describe("detectMime", () => {
  it("detects JPEG, PNG and WebP from their bytes", async () => {
    expect(await detectMime(await image("jpeg"))).toBe("image/jpeg");
    expect(await detectMime(await image("png"))).toBe("image/png");
    expect(await detectMime(await image("webp"))).toBe("image/webp");
  });

  it("returns null for plain text pretending to be an image", async () => {
    expect(await detectMime(Buffer.from("hello, I am not a photo"))).toBeNull();
  });
});

describe("isAllowedMime", () => {
  it("allows only the listed types per kind", () => {
    expect(isAllowedMime("PHOTO", "image/jpeg")).toBe(true);
    expect(isAllowedMime("PHOTO", "image/svg+xml")).toBe(false);
    expect(isAllowedMime("PHOTO", "video/mp4")).toBe(false);
    expect(isAllowedMime("VIDEO", "video/mp4")).toBe(true);
    expect(isAllowedMime("VOICE", "audio/webm")).toBe(true);
    expect(isAllowedMime("VOICE", "application/pdf")).toBe(false);
  });

  it("ignores codec parameters", () => {
    expect(isAllowedMime("VOICE", "audio/webm;codecs=opus")).toBe(true);
  });
});