import { describe, expect, it } from "vitest";
import {
  changePlanSchema,
  confirmSlugSchema,
  formFields,
  planFormSchema,
  reportOutcomeSchema,
  templateCreateSchema,
  templateDefaults,
  templateFormSchema,
} from "@/lib/schemas/admin";

const plan = {
  nameMs: "Premium",
  nameEn: "Premium",
  price: "40",
  uploadLimit: "",
  videoAllowed: "on",
  maxVideoSeconds: "",
  maxUploadMb: "15",
  storageLimitMb: "",
  retentionDays: "365",
  active: "on",
  sortOrder: "2",
};

const template = {
  nameMs: "Klasik",
  nameEn: "Classic",
  layout: "classic",
  font: "serif",
  primary: "#7a1f2b",
  background: "#fbf3e4",
  accent: "#c9a227",
  active: "on",
  sortOrder: "1",
};

describe("planFormSchema", () => {
  it("parses ringgit to sen", () => {
    expect(planFormSchema.parse({ ...plan, price: "40" }).priceSen).toBe(4000);
    expect(planFormSchema.parse({ ...plan, price: "40.50" }).priceSen).toBe(4050);
    expect(planFormSchema.parse({ ...plan, price: "0" }).priceSen).toBe(0);
    expect(planFormSchema.parse({ ...plan, price: "10000" }).priceSen).toBe(1_000_000);
  });

  it("rejects negative, non-numeric and over RM 10,000 prices as validation issues, never a thrown RangeError", () => {
    for (const price of ["-5", "abc", "", "10000.01", "1e3", "40.505"]) {
      const result = planFormSchema.safeParse({ ...plan, price });
      expect(result.success, price).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.path).toEqual(["price"]);
    }
  });

  it("outputs the Prisma Plan field names", () => {
    expect(planFormSchema.parse(plan)).toEqual({
      nameMs: "Premium",
      nameEn: "Premium",
      priceSen: 4000,
      uploadLimit: null,
      videoAllowed: true,
      maxVideoSeconds: null,
      maxUploadBytes: BigInt(15 * 1024 * 1024),
      storageLimitBytes: null,
      retentionDays: 365,
      active: true,
      sortOrder: 2,
    });
  });

  it("turns blank upload limit and storage into null, and keeps 0 as 0", () => {
    const blank = planFormSchema.parse({ ...plan, uploadLimit: " ", storageLimitMb: "" });
    expect(blank.uploadLimit).toBeNull();
    expect(blank.storageLimitBytes).toBeNull();
    expect(planFormSchema.parse({ ...plan, uploadLimit: "0" }).uploadLimit).toBe(0);
    expect(planFormSchema.parse({ ...plan, uploadLimit: "100000" }).uploadLimit).toBe(100000);
    expect(planFormSchema.safeParse({ ...plan, uploadLimit: "100001" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, uploadLimit: "-1" }).success).toBe(false);
  });

  it("converts MB to bytes as BigInt", () => {
    const parsed = planFormSchema.parse({ ...plan, storageLimitMb: "2048", maxUploadMb: "200" });
    expect(parsed.storageLimitBytes).toBe(BigInt(2048) * BigInt(1024 * 1024));
    expect(parsed.maxUploadBytes).toBe(BigInt(200 * 1024 * 1024));
    expect(planFormSchema.parse({ ...plan, storageLimitMb: "1048576" }).storageLimitBytes).toBe(BigInt(1048576) * BigInt(1024 * 1024));
    expect(planFormSchema.safeParse({ ...plan, storageLimitMb: "0" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, storageLimitMb: "1048577" }).success).toBe(false);
  });

  it("max video seconds blank is null, 0 and 601 are rejected", () => {
    expect(planFormSchema.parse({ ...plan, maxVideoSeconds: "" }).maxVideoSeconds).toBeNull();
    expect(planFormSchema.parse({ ...plan, maxVideoSeconds: "1" }).maxVideoSeconds).toBe(1);
    expect(planFormSchema.parse({ ...plan, maxVideoSeconds: "600" }).maxVideoSeconds).toBe(600);
    expect(planFormSchema.safeParse({ ...plan, maxVideoSeconds: "0" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, maxVideoSeconds: "601" }).success).toBe(false);
  });

  it("caps max upload at 200 MB and requires at least 1", () => {
    expect(planFormSchema.safeParse({ ...plan, maxUploadMb: "201" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, maxUploadMb: "0" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, maxUploadMb: "" }).success).toBe(false);
  });

  it("checks names, retention and sort order ranges", () => {
    expect(planFormSchema.safeParse({ ...plan, nameMs: " " }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, nameEn: "a".repeat(61) }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, retentionDays: "0" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, retentionDays: "3651" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, sortOrder: "1001" }).success).toBe(false);
    expect(planFormSchema.parse({ ...plan, sortOrder: "0" }).sortOrder).toBe(0);
  });

  it("treats a checkbox as on for on or true, and absent or empty as off", () => {
    expect(planFormSchema.parse({ ...plan, videoAllowed: "true" }).videoAllowed).toBe(true);
    expect(planFormSchema.parse({ ...plan, videoAllowed: "" }).videoAllowed).toBe(false);
    const { videoAllowed: _v, active: _a, ...rest } = plan;
    const parsed = planFormSchema.parse(rest);
    expect(parsed.videoAllowed).toBe(false);
    expect(parsed.active).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, active: "yes" }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(planFormSchema.safeParse({ ...plan, code: "FREE" }).success).toBe(false);
    expect(planFormSchema.safeParse({ ...plan, priceSen: "1" }).success).toBe(false);
  });
});

describe("formFields", () => {
  it("ignores $ACTION_ keys and unlisted names, and omits missing ones", () => {
    const fd = new FormData();
    fd.set("$ACTION_ID_abc", "x");
    fd.set("$ACTION_REF_1", "");
    fd.set("planCode", "ECARD");
    fd.set("other", "y");
    expect(formFields(fd, ["planCode", "missing"])).toEqual({ planCode: "ECARD" });
    expect(changePlanSchema.safeParse(formFields(fd, ["planCode"])).success).toBe(true);
  });

  it("drops file entries", () => {
    const fd = new FormData();
    fd.set("planCode", new File(["x"], "x.txt"));
    expect(formFields(fd, ["planCode"])).toEqual({});
  });
});

describe("template schemas", () => {
  it("accepts a valid template and converts the checkbox and sort order", () => {
    expect(templateFormSchema.parse(template)).toEqual({ ...template, active: true, sortOrder: 1 });
    expect(templateFormSchema.parse({ ...template, active: "" }).active).toBe(false);
  });

  it("template codes are 3 to 40 lowercase letters, digits and hyphens", () => {
    const create = (code: string) => templateCreateSchema.safeParse({ ...template, code }).success;
    expect(create("classic-songket")).toBe(true);
    expect(create("abc")).toBe(true);
    expect(create("a".repeat(40))).toBe(true);
    for (const bad of ["ab", "a".repeat(41), "Classic", "has space", "under_score", "tëst", ""]) {
      expect(create(bad), bad).toBe(false);
    }
    // the code is create-only: the edit schema refuses it
    expect(templateFormSchema.safeParse({ ...template, code: "abc" }).success).toBe(false);
    expect(templateCreateSchema.safeParse(template).success).toBe(false);
  });

  it("colours must be #rrggbb", () => {
    for (const field of ["primary", "background", "accent"]) {
      expect(templateFormSchema.safeParse({ ...template, [field]: "red" }).success).toBe(false);
      expect(templateFormSchema.safeParse({ ...template, [field]: "#fff" }).success).toBe(false);
      expect(templateFormSchema.safeParse({ ...template, [field]: "#12345g" }).success).toBe(false);
      expect(templateFormSchema.safeParse({ ...template, [field]: "#AbCdEf" }).success).toBe(true);
    }
  });

  it("limits layout, font, names and sort order", () => {
    expect(templateFormSchema.safeParse({ ...template, layout: "grid" }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...template, font: "mono" }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...template, nameMs: "" }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...template, nameEn: "a".repeat(61) }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...template, sortOrder: "1001" }).success).toBe(false);
  });

  it("builds the Template.defaults object", () => {
    expect(templateDefaults(templateFormSchema.parse({ ...template, layout: "floral", font: "sans" }))).toEqual({
      layout: "floral",
      font: "sans",
      primary: "#7a1f2b",
      background: "#fbf3e4",
      accent: "#c9a227",
    });
  });
});

describe("small admin schemas", () => {
  it("changePlanSchema takes a plan code only", () => {
    expect(changePlanSchema.parse({ planCode: "PREMIUM" })).toEqual({ planCode: "PREMIUM" });
    expect(changePlanSchema.safeParse({ planCode: "GOLD" }).success).toBe(false);
    expect(changePlanSchema.safeParse({ planCode: "FREE", x: 1 }).success).toBe(false);
  });

  it("reportOutcomeSchema takes RESOLVED or DISMISSED", () => {
    expect(reportOutcomeSchema.parse({ outcome: "DISMISSED" }).outcome).toBe("DISMISSED");
    expect(reportOutcomeSchema.safeParse({ outcome: "OPEN" }).success).toBe(false);
  });

  it("confirmSlugSchema trims and needs 1 to 80 characters", () => {
    expect(confirmSlugSchema.parse({ confirmSlug: "  my-event " }).confirmSlug).toBe("my-event");
    expect(confirmSlugSchema.safeParse({ confirmSlug: "  " }).success).toBe(false);
    expect(confirmSlugSchema.safeParse({ confirmSlug: "a".repeat(81) }).success).toBe(false);
  });
});
