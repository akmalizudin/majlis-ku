import { describe, expect, it } from "vitest";
import { cardInputSchema, DEFAULT_CARD, parseCardContent, whatsappLink } from "@/lib/schemas/card";

const full = {
  templateId: "tpl1",
  headline: "  Walimatulurus  ",
  intro: "Dengan segala hormatnya kami menjemput",
  hostLine: "Encik Ahmad & Puan Siti",
  names: "Aisyah & Daniel",
  note: "Pakaian: tema pastel",
  schedule: [{ time: "11:00", label: "Ketibaan tetamu" }],
  contacts: [{ name: "Kak Long", phone: "012-345 6789" }],
  photoKeys: [],
  showGuestbook: true,
  rsvpEnabled: true,
  rsvpDeadline: "2026-12-01",
  maxPax: 5,
  askPhone: false,
  published: true,
};

describe("cardInputSchema", () => {
  it("accepts a full card and trims text", () => {
    const parsed = cardInputSchema.parse(full);
    expect(parsed.headline).toBe("Walimatulurus");
    expect(parsed.contacts[0]!.phone).toBe("012-345 6789");
  });

  it("caps schedule rows at 6 and contacts at 3", () => {
    const schedule = Array.from({ length: 7 }, () => ({ time: "12:00", label: "Makan" }));
    const contacts = Array.from({ length: 4 }, () => ({ name: "A", phone: "0123456789" }));
    expect(cardInputSchema.safeParse({ ...full, schedule }).success).toBe(false);
    expect(cardInputSchema.safeParse({ ...full, contacts }).success).toBe(false);
  });

  it("rejects a bad phone and an out-of-range pax limit", () => {
    expect(cardInputSchema.safeParse({ ...full, contacts: [{ name: "A", phone: "call me" }] }).success).toBe(false);
    expect(cardInputSchema.safeParse({ ...full, maxPax: 0 }).success).toBe(false);
    expect(cardInputSchema.safeParse({ ...full, maxPax: 21 }).success).toBe(false);
  });

  it("allows an empty deadline", () => {
    expect(cardInputSchema.parse({ ...full, rsvpDeadline: "" }).rsvpDeadline).toBeNull();
  });
});

describe("parseCardContent", () => {
  it("falls back to defaults for missing or broken content", () => {
    expect(parseCardContent(null)).toEqual(DEFAULT_CARD);
    expect(parseCardContent({ headline: 42, maxPax: "lots" })).toEqual(DEFAULT_CARD);
  });

  it("keeps valid stored fields", () => {
    const stored = { ...DEFAULT_CARD, headline: "Majlis Hari Jadi", maxPax: 3 };
    expect(parseCardContent(stored)).toMatchObject({ headline: "Majlis Hari Jadi", maxPax: 3 });
  });
});

describe("whatsappLink", () => {
  it("turns Malaysian numbers into wa.me links", () => {
    expect(whatsappLink("012-345 6789")).toBe("https://wa.me/60123456789");
    expect(whatsappLink("+60 12 345 6789")).toBe("https://wa.me/60123456789");
    expect(whatsappLink("60123456789")).toBe("https://wa.me/60123456789");
  });
});