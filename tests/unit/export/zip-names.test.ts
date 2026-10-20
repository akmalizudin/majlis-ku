import { describe, expect, it } from "vitest";
import { wishesCsv, zipEntryName } from "@/server/export/zip";

describe("zipEntryName", () => {
  it("files each kind in its own folder with a safe, unique name", () => {
    const used = new Set<string>();
    expect(zipEntryName({ id: "abc", kind: "PHOTO", guestName: "Mak Cik/Kiah", mimeType: "image/jpeg" }, used)).toBe("gambar/Mak Cik Kiah-abc.jpg");
    expect(zipEntryName({ id: "def", kind: "VIDEO", guestName: "Ali", mimeType: "video/mp4" }, used)).toBe("video/Ali-def.mp4");
    expect(zipEntryName({ id: "ghi", kind: "VOICE", guestName: "Ah Meng", mimeType: "audio/webm" }, used)).toBe("suara/Ah Meng-ghi.webm");
  });

  it("never repeats a name", () => {
    const used = new Set<string>();
    const a = zipEntryName({ id: "x", kind: "PHOTO", guestName: "A", mimeType: "image/jpeg" }, used);
    const b = zipEntryName({ id: "x", kind: "PHOTO", guestName: "A", mimeType: "image/jpeg" }, used);
    expect(a).not.toBe(b);
  });
});

describe("wishesCsv", () => {
  it("has a header and escapes quotes, commas and new lines", () => {
    const csv = wishesCsv([{ guestName: 'Ali "Abu"', message: "Tahniah,\nsemoga bahagia", createdAt: new Date("2026-12-12T03:00:00Z"), moderation: "VISIBLE" }]);
    const [header, row] = csv.replace(/^﻿/, "").split("\r\n");
    expect(header).toBe("Nama,Ucapan,Masa,Status");
    expect(row).toBe('"Ali ""Abu""","Tahniah,\nsemoga bahagia",2026-12-12 11:00,VISIBLE');
  });

  it("neutralises values that spreadsheets would run as formulas", () => {
    const csv = wishesCsv([{ guestName: "=HYPERLINK(1)", message: "+1", createdAt: new Date("2026-12-12T03:00:00Z"), moderation: "VISIBLE" }]);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("'+1");
  });
});