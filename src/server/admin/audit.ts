import "server-only";
import type { AuditAction, Prisma } from "@prisma/client";

/**
 * Ids, slugs, codes and changed plan fields only: never guest names, wishes or report text.
 * InputJsonObject rejects bigint, so byte limits must already be MB numbers.
 */
export type AuditDetails = Prisma.InputJsonObject;

export async function writeAudit(
  tx: Prisma.TransactionClient,
  entry: { actorId: string | null; action: AuditAction; targetType: "event" | "report" | "plan" | "template"; targetId: string; details: AuditDetails },
) {
  await tx.auditLog.create({ data: entry });
}
