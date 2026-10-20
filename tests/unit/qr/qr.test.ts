import { describe, expect, it } from "vitest";
import { qrPng, qrSvg, standPdf } from "@/server/qr/qr";

const url = "http://localhost:3000/aisyah-dan-daniel-x1y2z";

describe("QR", () => {
  it("makes a PNG", async () => {
    const png = await qrPng(url, 512);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it("makes an SVG", async () => {
    const svg = await qrSvg(url);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("viewBox");
  });

  it("makes A5 and A4 PDF stands", async () => {
    for (const size of ["A5", "A4"] as const) {
      const pdf = await standPdf({
        url,
        size,
        hostNames: "Aisyah & Daniel",
        title: "Walimatulurus",
        dateText: "Sabtu, 12 Disember 2026",
        themeColor: "#8b5e3c",
      });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(1000);
    }
  });
});