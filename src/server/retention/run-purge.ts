const DAY_MS = 24 * 60 * 60 * 1000;

export type PurgeCounts = { uploads: number; wishes: number; rsvps: number; reports: number };

export type PurgeOps = {
  dueEventIds(now: Date): Promise<string[]>;
  claim(id: string, now: Date): Promise<boolean>;
  closeStreams(id: string): void;
  deleteFiles(id: string): Promise<void>;
  deleteGuestData(id: string, now: Date): Promise<{ finalized: boolean; counts: PurgeCounts }>;
  recentlyArchivedIds(since: Date): Promise<string[]>;
  sweepGuestData(id: string): Promise<void>;
  deleteOldRateLimits(before: Date): Promise<void>;
  log(line: string): void;
};

/** Retention purge, in the order of spec 8a criteria 2 to 7. Logs ids and error names only, never messages. */
export async function runPurge(ops: PurgeOps, now: Date): Promise<{ archived: number; failed: number }> {
  const errorName = (error: unknown) => (error instanceof Error ? error.name : "Error");
  const fail = (id: string, error: unknown) => ops.log(`[purge] event ${id} failed: ${errorName(error)}`);
  let archived = 0;
  let failed = 0;

  for (const id of await ops.dueEventIds(now)) {
    try {
      if (!(await ops.claim(id, now))) continue;
      ops.closeStreams(id);
      await ops.deleteFiles(id);
      if ((await ops.deleteGuestData(id, now)).finalized) archived += 1;
    } catch (error) {
      failed += 1;
      fail(id, error);
    }
  }

  // Late files from work that passed its checks before the claim (upload URLs, video jobs, cover saves).
  const since = new Date(now.getTime() - DAY_MS);
  try {
    for (const id of await ops.recentlyArchivedIds(since)) {
      try {
        await ops.deleteFiles(id);
        await ops.sweepGuestData(id);
      } catch (error) {
        fail(id, error);
      }
    }
  } catch (error) {
    ops.log(`[purge] sweep failed: ${errorName(error)}`);
  }

  try {
    await ops.deleteOldRateLimits(since);
  } catch (error) {
    ops.log(`[purge] rate-limit cleanup failed: ${errorName(error)}`);
  }
  return { archived, failed };
}
