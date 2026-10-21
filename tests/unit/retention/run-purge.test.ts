import { describe, expect, it } from "vitest";
import { runPurge, type PurgeOps } from "@/server/retention/run-purge";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-21T00:00:00Z");
const counts = { uploads: 0, wishes: 0, rsvps: 0, reports: 0 };

function fakeOps(over: Partial<PurgeOps> & { due?: string[]; recent?: string[] } = {}) {
  const calls: string[] = [];
  const logs: string[] = [];
  const seen: { dueNow?: Date; since?: Date; before?: Date } = {};
  const ops: PurgeOps = {
    dueEventIds: async (n) => ((seen.dueNow = n), over.due ?? ["e1"]),
    claim: async (id) => (calls.push(`claim ${id}`), true),
    closeStreams: (id) => void calls.push(`close ${id}`),
    deleteFiles: async (id) => void calls.push(`files ${id}`),
    deleteGuestData: async (id) => (calls.push(`data ${id}`), { finalized: true, counts }),
    recentlyArchivedIds: async (since) => ((seen.since = since), over.recent ?? []),
    sweepGuestData: async (id) => void calls.push(`sweep ${id}`),
    deleteOldRateLimits: async (before) => void ((seen.before = before), calls.push("rate")),
    log: (line) => void logs.push(line),
    ...over,
  };
  return { ops, calls, logs, seen };
}

describe("runPurge", () => {
  it("archives a due event in order: claim, close streams, delete files, delete guest data", async () => {
    const { ops, calls } = fakeOps();
    const result = await runPurge(ops, now);
    expect(calls.slice(0, 4)).toEqual(["claim e1", "close e1", "files e1", "data e1"]);
    expect(result).toEqual({ archived: 1, failed: 0 });
  });

  it("skips an event whose claim fails", async () => {
    const { ops, calls } = fakeOps({ claim: async () => false });
    expect(await runPurge(ops, now)).toEqual({ archived: 0, failed: 0 });
    expect(calls).not.toContain("files e1");
  });

  it("does not count an event another run finalized", async () => {
    const { ops } = fakeOps({ deleteGuestData: async () => ({ finalized: false, counts }) });
    expect((await runPurge(ops, now)).archived).toBe(0);
  });

  it("keeps going after one event fails and logs only the error name", async () => {
    const { ops, calls, logs } = fakeOps({
      due: ["e1", "e2"],
      deleteFiles: async (id) => {
        if (id === "e1") throw new TypeError("guest secret");
        calls.push(`files ${id}`);
      },
    });
    expect(await runPurge(ops, now)).toEqual({ archived: 1, failed: 1 });
    expect(logs).toEqual(["[purge] event e1 failed: TypeError"]);
    expect(logs.join()).not.toContain("guest secret");
  });

  it("re-sweeps events archived in the last 24 hours", async () => {
    const { ops, calls, seen } = fakeOps({ due: [], recent: ["a1", "a2"] });
    await runPurge(ops, now);
    expect(seen.since).toEqual(new Date(now.getTime() - DAY));
    expect(calls).toEqual(["files a1", "sweep a1", "files a2", "sweep a2", "rate"]);
  });

  it("deletes rate-limit rows older than a day", async () => {
    const { ops, seen } = fakeOps({ due: [] });
    await runPurge(ops, now);
    expect(seen.before).toEqual(new Date(now.getTime() - DAY));
  });

  it("keeps sweeping after one re-sweep fails and logs only the error name", async () => {
    const { ops, calls, logs } = fakeOps({
      due: [],
      recent: ["a1", "a2"],
      sweepGuestData: async (id) => {
        if (id === "a1") throw new RangeError("guest secret");
        calls.push(`sweep ${id}`);
      },
    });
    expect(await runPurge(ops, now)).toEqual({ archived: 0, failed: 0 });
    expect(calls).toContain("sweep a2");
    expect(logs).toEqual(["[purge] event a1 failed: RangeError"]);
  });

  it("still returns the counts when listing recent events fails", async () => {
    const { ops, calls, logs } = fakeOps({
      recentlyArchivedIds: async () => {
        throw new TypeError("guest secret");
      },
    });
    expect(await runPurge(ops, now)).toEqual({ archived: 1, failed: 0 });
    expect(logs).toEqual(["[purge] sweep failed: TypeError"]);
    expect(calls).toContain("rate");
  });

  it("still returns the counts when the rate-limit cleanup fails", async () => {
    const { ops, logs } = fakeOps({
      deleteOldRateLimits: async () => {
        throw new TypeError("guest secret");
      },
    });
    expect(await runPurge(ops, now)).toEqual({ archived: 1, failed: 0 });
    expect(logs).toEqual(["[purge] rate-limit cleanup failed: TypeError"]);
  });
});
