import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { rsvpCsv, rsvpXlsx } from "@/server/rsvp/export";

const rows = [
  { name: "Ali", attending: true, pax: 3, phone: "0123456789", message: "Tahniah!", updatedAt: new Date("2026-11-01T02:00:00Z") },
  { name: "Siti", attending: false, pax: 0, phone: null, message: null, updatedAt: new Date("2026-11-02T02:00:00Z") },
];

describe("rsvpCsv", () => {
  it("has a header and one row per reply", () => {
    const lines = rsvpCsv(rows, "ms").replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toBe("Nama,Hadir,Pax,Telefon,Mesej,Masa");
    expect(lines[1]).toBe("Ali,Ya,3,0123456789,Tahniah!,2026-11-01 10:00");
    expect(lines[2]).toBe("Siti,Tidak,0,,,2026-11-02 10:00");
  });
});

describe("rsvpXlsx", () => {
  it("makes a workbook with the replies and a totals row", async () => {
    const buffer = await rsvpXlsx(rows, "en");
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0]!;
    expect(sheet.getRow(1).getCell(1).value).toBe("Name");
    expect(sheet.getRow(2).getCell(1).value).toBe("Ali");
    const last = sheet.getRow(sheet.rowCount);
    expect(last.getCell(1).value).toBe("Total attending");
    expect(last.getCell(3).value).toBe(3);
  });
});