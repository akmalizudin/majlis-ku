import { describe, expect, it } from "vitest";
import { printable, wishesPdf } from "@/server/export/wishes-pdf";

const base = { hostNames: "Aisyah & Daniel", title: "Walimatulurus", dateText: "Sabtu, 12 Disember 2026", themeColor: "#8b5e3c", locale: "ms" as const };

function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

describe("printable", () => {
  it("keeps Malay, accents and Arabic script but drops emoji", () => {
    expect(printable("Selamat pengantin baru 🎉💐")).toBe("Selamat pengantin baru");
    expect(printable("Café Zoë")).toBe("Café Zoë");
    expect(printable("بارك الله لكما")).toBe("بارك الله لكما");
  });
});

describe("wishesPdf", () => {
  it("makes a PDF with a cover page", async () => {
    const pdf = await wishesPdf({ ...base, wishes: [] });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1);
  });

  it("adds pages as wishes grow", async () => {
    const wish = (i: number) => ({ guestName: `Tetamu ${i}`, message: `Ucapan nombor ${i}. `.repeat(10), createdAt: new Date() });
    const few = await wishesPdf({ ...base, wishes: [wish(1)] });
    const many = await wishesPdf({ ...base, wishes: Array.from({ length: 60 }, (_, i) => wish(i)) });
    expect(pageCount(many)).toBeGreaterThan(pageCount(few));
  });
});