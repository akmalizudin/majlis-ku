import type { Plan, UploadKind } from "@prisma/client";

const MB = 1024n * 1024n;

/** Hard per-file caps by kind, on top of the plan's own per-file cap. */
export const KIND_MAX_BYTES: Record<UploadKind, bigint> = {
  PHOTO: 15n * MB,
  VIDEO: 200n * MB,
  VOICE: 10n * MB,
};

/** Longest voice message accepted, whatever the plan. */
export const MAX_VOICE_SECONDS = 180;

export type PlanLimits = Pick<
  Plan,
  "includesGallery" | "uploadLimit" | "videoAllowed" | "maxVideoSeconds" | "maxUploadBytes" | "storageLimitBytes"
>;

export type EventUsage = {
  uploadCount: number; // confirmed items
  pendingCount: number; // upload URLs issued but not yet confirmed
  storageBytes: bigint;
};

export type UploadRequest = { kind: UploadKind; sizeBytes: number; durationSec?: number | null };

export type LimitCode =
  | "gallery_not_in_plan"
  | "limit_reached"
  | "too_large"
  | "storage_full"
  | "video_not_in_plan"
  | "too_long";

export type LimitResult = { ok: true } | { ok: false; code: LimitCode };

/** Server-side gate for every upload. The client's numbers are only a declaration; the server re-checks after upload. */
export function checkUploadAllowed(plan: PlanLimits, usage: EventUsage, request: UploadRequest): LimitResult {
  if (!plan.includesGallery) return { ok: false, code: "gallery_not_in_plan" };
  if (request.kind === "VIDEO" && !plan.videoAllowed) return { ok: false, code: "video_not_in_plan" };

  if (plan.uploadLimit !== null && usage.uploadCount + usage.pendingCount >= plan.uploadLimit) {
    return { ok: false, code: "limit_reached" };
  }

  const size = BigInt(Math.trunc(request.sizeBytes));
  const cap = plan.maxUploadBytes < KIND_MAX_BYTES[request.kind] ? plan.maxUploadBytes : KIND_MAX_BYTES[request.kind];
  if (size <= 0n || size > cap) return { ok: false, code: "too_large" };

  if (plan.storageLimitBytes !== null && usage.storageBytes + size > plan.storageLimitBytes) {
    return { ok: false, code: "storage_full" };
  }

  const duration = request.durationSec ?? null;
  if (request.kind === "VIDEO" && duration !== null && plan.maxVideoSeconds !== null && duration > plan.maxVideoSeconds) {
    return { ok: false, code: "too_long" };
  }
  if (request.kind === "VOICE" && duration !== null && duration > MAX_VOICE_SECONDS) {
    return { ok: false, code: "too_long" };
  }
  return { ok: true };
}