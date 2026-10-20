import { describe, expect, it } from "vitest";
import { isReservedSlug, makeSlug, RESERVED_SLUGS, slugify } from "@/server/events/slug";

describe("slugify", () => {
  it("lowercases, joins with dashes and turns & into dan", () => {
    expect(slugify("Aisyah & Daniel")).toBe("aisyah-dan-daniel");
  });

  it("strips accents, emoji and punctuation", () => {
    expect(slugify("Zoë's 30th Birthday!! 🎉")).toBe("zoes-30th-birthday");
  });

  it("trims to 40 characters without a trailing dash", () => {
    const slug = slugify("Majlis Perkahwinan Nur Aisyah binti Abdullah dan Muhammad Daniel");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back to 'majlis' when nothing usable is left", () => {
    expect(slugify("🎉🎉")).toBe("majlis");
  });
});

describe("makeSlug", () => {
  it("appends a 5-character lowercase suffix", () => {
    expect(makeSlug("Aisyah & Daniel")).toMatch(/^aisyah-dan-daniel-[a-z0-9]{5}$/);
  });

  it("gives different slugs for the same names", () => {
    expect(makeSlug("Aisyah")).not.toBe(makeSlug("Aisyah"));
  });
});

describe("reserved slugs", () => {
  it("covers app routes", () => {
    for (const word of ["dashboard", "admin", "signin", "api", "en", "ms", "i", "slideshow"]) {
      expect(isReservedSlug(word)).toBe(true);
    }
    expect(RESERVED_SLUGS.has("privacy")).toBe(true);
    expect(isReservedSlug("aisyah-dan-daniel-x1y2z")).toBe(false);
  });
});