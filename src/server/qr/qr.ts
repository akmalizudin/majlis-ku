import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { BRAND_NAME } from "@/lib/brand";

// Error correction "M" survives a little damage on a printed card and keeps the code readable.
const QR_OPTIONS = { errorCorrectionLevel: "M" as const, margin: 2 };

export async function qrPng(url: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...QR_OPTIONS, type: "png", width });
}

export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
}

export type StandInput = {
  url: string;
  size: "A5" | "A4";
  hostNames: string;
  title: string;
  dateText: string;
  themeColor: string;
};

/** A printable table stand: names, title, date, a big QR code and bilingual instructions. */
export async function standPdf({ url, size, hostNames, title, dateText, themeColor }: StandInput): Promise<Buffer> {
  const doc = new PDFDocument({ size, margin: 0, info: { Title: `${hostNames} QR`, Author: BRAND_NAME } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const { width, height } = doc.page;
  const scale = size === "A4" ? 1.414 : 1;
  const pad = 36 * scale;

  doc.rect(0, 0, width, height).fill("#fbf7f2");
  doc.rect(pad / 2, pad / 2, width - pad, height - pad).lineWidth(2 * scale).stroke(themeColor);

  let y = pad * 1.6;
  doc.fillColor(themeColor).font("Helvetica").fontSize(11 * scale).text(title.toUpperCase(), pad, y, {
    width: width - pad * 2,
    align: "center",
    characterSpacing: 1.5,
  });
  y = doc.y + 8 * scale;
  doc.fillColor("#2b2118").font("Times-Bold").fontSize(30 * scale).text(hostNames, pad, y, { width: width - pad * 2, align: "center" });
  y = doc.y + 4 * scale;
  doc.font("Helvetica").fontSize(11 * scale).fillColor("#5a4a3c").text(dateText, pad, y, { width: width - pad * 2, align: "center" });

  const qrSize = Math.min(width - pad * 4, 260 * scale);
  const qr = await qrPng(url, Math.round(qrSize * 3));
  const qrY = doc.y + 18 * scale;
  doc.image(qr, (width - qrSize) / 2, qrY, { width: qrSize, height: qrSize });

  y = qrY + qrSize + 16 * scale;
  doc.fillColor("#2b2118").font("Helvetica-Bold").fontSize(14 * scale).text("Imbas untuk kongsi gambar & ucapan", pad, y, {
    width: width - pad * 2,
    align: "center",
  });
  doc.font("Helvetica").fontSize(11 * scale).fillColor("#5a4a3c").text("Scan to share photos & wishes", pad, doc.y + 2 * scale, {
    width: width - pad * 2,
    align: "center",
  });
  doc.fontSize(9 * scale).text("Tanpa aplikasi, tanpa akaun · No app, no account", pad, doc.y + 6 * scale, {
    width: width - pad * 2,
    align: "center",
  });
  doc.fontSize(8 * scale).fillColor("#8a7a6c").text(url.replace(/^https?:\/\//, ""), pad, height - pad * 1.5, {
    width: width - pad * 2,
    align: "center",
  });

  doc.end();
  return done;
}