// Runs once when the Next.js server starts. The `if` form lets the bundler drop the Node-only
// import from the edge build (see the Next.js instrumentation docs).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
