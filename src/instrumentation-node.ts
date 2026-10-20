import { resumeProcessing } from "./server/uploads/processing";

// Pick up uploads that were still processing when the server last stopped.
try {
  const resumed = await resumeProcessing();
  if (resumed > 0) console.log(`[media] resumed ${resumed} upload(s) left processing`);
} catch (error) {
  // The database may not be up yet (for example during `next build`); uploads resume on the next start.
  console.warn("[media] could not resume processing:", error instanceof Error ? error.message : error);
}