import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { finalizePurge, sweepRows } from "@/server/retention/purge-data";

const now = new Date("2026-10-21T00:00:00Z");
const TABLES = ["upload", "wish", "rsvp", "guest", "abuseReport", "eCard"] as const;

function fakeTx(updateCount: number) {
  const calls: { op: string; arg: unknown }[] = [];
  const counts: Record<string, number> = { upload: 3, wish: 2, rsvp: 1, guest: 4, abuseReport: 5, eCard: 1 };
  const tx = {
    ...Object.fromEntries(
      TABLES.map((t) => [t, { deleteMany: async (arg: unknown) => (calls.push({ op: `${t}.deleteMany`, arg }), { count: counts[t] }) }]),
    ),
    event: {
      updateMany: async (arg: unknown) => (calls.push({ op: "event.updateMany", arg }), { count: updateCount }),
      findUnique: async (arg: unknown) => (calls.push({ op: "event.findUnique", arg }), { slug: "majlis-e1" }),
    },
  } as unknown as Prisma.TransactionClient;
  const audits: unknown[] = [];
  const audit = async (_tx: Prisma.TransactionClient, entry: unknown) => void audits.push(entry);
  return { tx, calls, audits, audit };
}

describe("finalizePurge", () => {
  it("deletes the six guest tables by eventId", async () => {
    const { tx, calls, audit } = fakeTx(1);
    await finalizePurge(tx, "e1", now, audit);
    for (const t of TABLES) expect(calls).toContainEqual({ op: `${t}.deleteMany`, arg: { where: { eventId: "e1" } } });
  });

  it("finalizes only an event with archivedAt null and clears its data fields", async () => {
    const { tx, calls, audit } = fakeTx(1);
    await finalizePurge(tx, "e1", now, audit);
    expect(calls.find((c) => c.op === "event.updateMany")?.arg).toEqual({
      where: { id: "e1", archivedAt: null },
      data: { archivedAt: now, coverKey: null, pinHash: null, uploadCount: 0, storageBytes: 0 },
    });
  });

  it("writes one audit row with the slug and counts when the update hit one row", async () => {
    const { tx, audits, audit } = fakeTx(1);
    const result = await finalizePurge(tx, "e1", now, audit);
    expect(result.finalized).toBe(true);
    expect(audits).toEqual([
      { actorId: null, action: "EVENT_PURGED", targetType: "event", targetId: "e1", details: { slug: "majlis-e1", uploads: 3, wishes: 2, rsvps: 1, reports: 5 } },
    ]);
  });

  it("writes no audit row when another run finalized first", async () => {
    const { tx, audits, audit } = fakeTx(0);
    expect((await finalizePurge(tx, "e1", now, audit)).finalized).toBe(false);
    expect(audits).toEqual([]);
  });
});

describe("sweepRows", () => {
  it("deletes the six tables and clears the cover, without an audit row", async () => {
    const { tx, calls } = fakeTx(1);
    await sweepRows(tx, "e1");
    for (const t of TABLES) expect(calls).toContainEqual({ op: `${t}.deleteMany`, arg: { where: { eventId: "e1" } } });
    expect(calls.find((c) => c.op === "event.updateMany")?.arg).toEqual({ where: { id: "e1" }, data: { coverKey: null } });
  });
});
