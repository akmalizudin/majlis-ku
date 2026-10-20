// A tiny in-process job queue: jobs in the same lane run one after another, lanes run side by side.
// Media processing uses one lane per kind so a long video never blocks voice notes.

export function createJobQueue() {
  const tails = new Map<string, Promise<unknown>>();

  function enqueue<T>(lane: string, job: () => Promise<T>): Promise<T> {
    const previous = tails.get(lane) ?? Promise.resolve();
    const run = previous.then(job, job);
    // The lane continues whether this job succeeds or fails.
    const tail = run.catch(() => undefined);
    tails.set(lane, tail);
    void tail.then(() => {
      if (tails.get(lane) === tail) tails.delete(lane);
    });
    return run;
  }

  return { enqueue };
}

const globalForQueue = globalThis as unknown as { mediaQueue?: ReturnType<typeof createJobQueue> };

/** The process-wide queue (one per server process, survives hot reloads in development). */
export const mediaQueue = (globalForQueue.mediaQueue ??= createJobQueue());