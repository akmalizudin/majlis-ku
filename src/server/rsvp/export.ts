import ExcelJS from "exceljs";
import { utcToKlLocal, type AppLocale } from "@/lib/dates";
import { csv } from "@/server/export/zip";
import { rsvpTotals } from "./rules";

export type RsvpRow = { name: string; attending: boolean; pax: number; phone: string | null; message: string | null; updatedAt: Date };

const HEADERS: Record<AppLocale, string[]> = {
  ms: ["Nama", "Hadir", "Pax", "Telefon", "Mesej", "Masa"],
  en: ["Name", "Attending", "Pax", "Phone", "Message", "Time"],
};
const YES_NO: Record<AppLocale, [string, string]> = { ms: ["Ya", "Tidak"], en: ["Yes", "No"] };
const TOTAL: Record<AppLocale, string> = { ms: "Jumlah hadir", en: "Total attending" };

const when = (date: Date) => utcToKlLocal(date).replace("T", " ");

export function rsvpCsv(rows: RsvpRow[], locale: AppLocale): string {
  const [yes, no] = YES_NO[locale];
  return csv([
    HEADERS[locale],
    ...rows.map((r) => [r.name, r.attending ? yes : no, String(r.pax), r.phone ?? "", r.message ?? "", when(r.updatedAt)]),
  ]);
}

export async function rsvpXlsx(rows: RsvpRow[], locale: AppLocale): Promise<Buffer> {
  const [yes, no] = YES_NO[locale];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Majlis Ku";
  const sheet = workbook.addWorksheet("RSVP");
  sheet.columns = HEADERS[locale].map((header, i) => ({ header, key: String(i), width: [28, 10, 8, 16, 50, 18][i] }));
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) {
    sheet.addRow([r.name, r.attending ? yes : no, r.pax, r.phone ?? "", r.message ?? "", when(r.updatedAt)]);
  }
  const totals = rsvpTotals(rows);
  const totalRow = sheet.addRow([TOTAL[locale], totals.attending, totals.pax]);
  totalRow.font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}