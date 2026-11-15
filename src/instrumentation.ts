/**
 * Runs once when the server starts. Begins recording cluster metrics so the
 * usage charts have history as soon as someone opens the dashboard.
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return
  }
  const { startMetricsSampler } = await import("./server/metrics-history")
  startMetricsSampler()
}