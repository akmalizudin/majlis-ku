import { describe, expect, it } from "vitest";
import { templateUsable } from "@/server/ecard/templates";

describe("templateUsable", () => {
  it("allows an active template", () => {
    expect(templateUsable({ id: "t1", active: true }, "t2")).toBe(true);
  });

  it("allows the card's current template even when inactive", () => {
    expect(templateUsable({ id: "t1", active: false }, "t1")).toBe(true);
  });

  it("refuses another inactive or unknown template", () => {
    expect(templateUsable({ id: "t1", active: false }, "t2")).toBe(false);
    expect(templateUsable({ id: "t1", active: false }, null)).toBe(false);
    expect(templateUsable(null, "t1")).toBe(false);
  });
});
