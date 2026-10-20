import { join } from "node:path";
import PDFDocument from "pdfkit";
import { BRAND_NAME } from "@/lib/brand";
import { EVENT_TIMEZONE, type AppLocale } from "@/lib/dates";

// DejaVu Sans covers Malay, accented Latin and Arabic script. Emoji are not in it, so they are dropped.
const FONT_DIR = join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
const REGULAR = join(FONT_DIR, "DejaVuSans.ttf");
const BOLD = join(FONT_DIR, "DejaVuSans-Bold.ttf");

/** Remove what the PDF font cannot draw (emoji and their joiners), then tidy the spaces. */
export function printable(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

export type PdfWish = { guestName: string; message: string; createdAt: Date };

export async function wishesPdf({
  hostNames,
  title,
  dateText,
  themeColor,
  locale,
  wishes,
}: {
  hostNames: string;
  title: string;
  dateText: string;
  themeColor: string;
  locale: AppLocale;
  wishes: PdfWish[];
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: `${hostNames} - Ucapan`, Author: BRAND_NAME }, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.registerFont("body", REGULAR);
  doc.registerFont("bold", BOLD);

  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const time = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-GB", {
    timeZone: EVENT_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Cover page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#fbf7f2");
  doc.fillColor(themeColor).font("body").fontSize(12).text(printable(title).toUpperCase(), doc.page.margins.left, 220, { width, align: "center", characterSpacing: 2 });
  doc.moveDown(0.8).fillColor("#2b2118").font("bold").fontSize(34).text(printable(hostNames), { width, align: "center" });
  doc.moveDown(0.4).fillColor("#5a4a3c").font("body").fontSize(13).text(dateText, { width, align: "center" });
  doc.moveDown(2).fontSize(12).text(locale === "ms" ? `${wishes.length} ucapan daripada tetamu` : `${wishes.length} wishes from guests`, { width, align: "center" });

  // Wishes, two-line gap between cards; pdfkit breaks pages for us.
  if (wishes.length > 0) {
    doc.addPage();
    for (const wish of wishes) {
      const message = printable(wish.message) || "…";
      const height = doc.font("body").fontSize(12).heightOfString(message, { width: width - 24 }) + 48;
      if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
      const top = doc.y;
      doc.roundedRect(doc.page.margins.left, top, width, height, 10).fillAndStroke("#ffffff", "#e8ded3");
      doc.fillColor("#2b2118").font("body").fontSize(12).text(message, doc.page.margins.left + 12, top + 12, { width: width - 24 });
      doc
        .fillColor(themeColor)
        .font("bold")
        .fontSize(10)
        .text(`— ${printable(wish.guestName) || "Tetamu"}  ·  ${time.format(wish.createdAt)}`, doc.page.margins.left + 12, top + height - 24, { width: width - 24 });
      doc.y = top + height + 14;
    }
  }

  // Page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start + 1; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font("body").fontSize(9).fillColor("#8a7a6c").text(`${i + 1 - range.start} / ${range.count}`, doc.page.margins.left, doc.page.height - 40, {
      width,
      align: "center",
      lineBreak: false,
    });
  }
  doc.end();
  return done;
}