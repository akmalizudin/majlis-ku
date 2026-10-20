import { describe, expect, it } from "vitest";
import { MB, PLANS, TEMPLATES } from "../../prisma/seed-data";

const byCode = Object.fromEntries(PLANS.map((p) => [p.code, p]));

describe("seed plans", () => {
  it("has exactly Free, E-card and Premium", () => {
    expect(PLANS.map((p) => p.code).sort()).toEqual(["ECARD", "FREE", "PREMIUM"]);
  });

  it("Free: gallery only, 100 items, no video, kept 30 days", () => {
    expect(byCode.FREE).toMatchObject({
      priceSen: 0,
      includesGallery: true,
      includesEcard: false,
      uploadLimit: 100,
      videoAllowed: false,
      retentionDays: 30,
    });
  });

  it("E-card: RM 40, card only", () => {
    expect(byCode.ECARD).toMatchObject({ priceSen: 4000, includesEcard: true, includesGallery: false });
  });

  it("Premium: RM 120, unlimited uploads, video up to 60 s, kept 12 months", () => {
    expect(byCode.PREMIUM).toMatchObject({
      priceSen: 12000,
      includesGallery: true,
      includesEcard: true,
      uploadLimit: null,
      videoAllowed: true,
      maxVideoSeconds: 60,
      retentionDays: 365,
    });
  });

  it("caps every file at the video size limit at most", () => {
    for (const plan of PLANS) expect(plan.maxUploadBytes).toBeLessThanOrEqual(200n * MB);
  });
});

describe("seed templates", () => {
  it("has three templates with unique codes and both names", () => {
    expect(TEMPLATES).toHaveLength(3);
    expect(new Set(TEMPLATES.map((t) => t.code)).size).toBe(3);
    for (const t of TEMPLATES) {
      expect(t.nameMs).not.toBe("");
      expect(t.nameEn).not.toBe("");
    }
  });
});
