import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processPhoto } from "@/server/media/images";

describe("processPhoto", () => {
  it("makes a display copy without EXIF and a thumbnail at most 400 px wide", async () => {
    const original = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#ffffff" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "Secret Location Owner" } })
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const result = await processPhoto(original);

    expect(result.width).toBe(3000);
    expect(result.height).toBe(2000);
    const display = await sharp(result.display).metadata();
    expect(display.exif).toBeUndefined();
    expect(Math.max(display.width ?? 0, display.height ?? 0)).toBeLessThanOrEqual(2048);
    const thumb = await sharp(result.thumb).metadata();
    expect(thumb.format).toBe("webp");
    expect(thumb.width).toBeLessThanOrEqual(400);
  });

  it("applies the EXIF orientation before stripping it", async () => {
    const portrait = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#000000" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const result = await processPhoto(portrait);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });

  it("rejects something that is not an image", async () => {
    await expect(processPhoto(Buffer.from("not an image"))).rejects.toThrow();
  });
});