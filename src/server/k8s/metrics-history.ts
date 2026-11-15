import "server-only"
import type { MetricsHistory, MetricsSample } from "@/lib/schemas"
import { getEnv } from "@/server/env"
import { getClusterUsage } from "@/server/k8s/cluster"
import { logger } from "@/server/log"
/*
 * In-memory ring buffer of cluster-wide CPU/memory usage, sampled from
 * metrics-server. metrics-server keeps no history, so the dashboard records
 * its own (lost on restart; per replica). For long-term retention use
 * Prometheus — this is meant for an at-a-glance trend.
 */
interface SamplerState {
  samples: MetricsSample[]
  capacity: MetricsHistory["capacity"]
  timer?: ReturnType<typeof setInterval>
  inFlight?: Promise<void>
}
const STATE_KEY = Symbol.for("homelab-dashboard.metrics-history")
const globalState = globalThis as unknown as Record<symbol, SamplerState>
const state = (globalState[STATE_KEY] ??= {
  samples: [],
  capacity: { cpuCores: 0, memoryBytes: 0 },
})
function takeSample(): Promise<void> {
  state.inFlight ??= (async () => {
    try {
      const { capacity, usage } = await getClusterUsage()
      state.capacity = capacity
      if (!usage) return
      state.samples.push({ timestamp: Date.now(), ...usage })
      const overflow = state.samples.length - getEnv().METRICS_HISTORY_POINTS
      if (overflow > 0) state.samples.splice(0, overflow)
    } catch (error) {
      logger.throttled("metrics-sampler", "warn", "Metrics sample failed", { error })
    } finally {
      state.inFlight = undefined
    }
  })()
  return state.inFlight
}
/** Starts background sampling once per process. Safe to call repeatedly. */
export function startMetricsSampler() {
  if (state.timer) return
  state.timer = setInterval(() => {
    void takeSample()
  }, getEnv().METRICS_SAMPLE_INTERVAL_MS)
  // Never keep the process alive just for sampling.
  state.timer.unref?.()
  void takeSample()
}
export async function getMetricsHistory(): Promise<MetricsHistory> {
  startMetricsSampler()
  if (state.samples.length === 0) await takeSample()
  return {
    generatedAt: new Date().toISOString(),
    intervalMs: getEnv().METRICS_SAMPLE_INTERVAL_MS,
    capacity: state.capacity,
    samples: [...state.samples],
  }
}