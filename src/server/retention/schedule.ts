import "server-only";
import { purgeExpiredEvents } from "./purge";

const FIRST_RUN_MS = 60_000;
const EVERY_MS = 60 * 60_000;

// On globalThis because the instrumentation and the route handler may be bundled as separate module copies.
const globalForPurge = globalThis as unknown as {
  __purgeSchedule?: boolean;
  __purgeRunning?: ReturnType<typeof purgeExpiredEvents>;
};

/** One purge at a time per process: the timer and the cron route share the running promise. */
export function runPurgeOnce() {
  globalForPurge.__purgeRunning ??= purgeExpiredEvents().finally(() => {
    globalForPurge.__purgeRunning = undefined;
  });
  return globalForPurge.__purgeRunning;
}

function tick() {
  runPurgeOnce()
    .then(({ archived, failed }) => {
      if (archived > 0 || failed > 0) console.log(`[purge] archived ${archived} event(s), ${failed} failed`);
    })
    .catch((error: unknown) => console.warn(`[purge] run failed: ${error instanceof Error ? error.name : "Error"}`));
}

/** Hourly purge from the Node server; skipped during `next build` and after a dev reload. */
export function startPurgeSchedule() {
  if (process.env.NEXT_PHASE === "phase-production-build" || globalForPurge.__purgeSchedule) return;
  globalForPurge.__purgeSchedule = true;
  setTimeout(() => {
    tick();
    setInterval(tick, EVERY_MS).unref();
  }, FIRST_RUN_MS).unref();
}
