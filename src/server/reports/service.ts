import "server-only";
import type { ReportInput } from "@/lib/schemas/report";
import { db } from "@/server/db";

/** Reason and optional text only: no name, contact, IP or device token is stored with a report. */
export async function createReport(eventId: string, input: ReportInput): Promise<void> {
  await db.abuseReport.create({ data: { eventId, reason: input.reason, details: input.details } });
}
