import { ReportReason } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { REPORT_REASONS } from "@/lib/schemas/report";

describe("report reasons", () => {
  it("report reasons match the Prisma enum", () => {
    expect([...REPORT_REASONS].sort()).toEqual(Object.values(ReportReason).sort());
  });
});
