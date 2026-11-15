import { handle } from "@/server/http"
import { getMetricsHistory } from "@/server/metrics-history"

export function GET() {
  return handle("read metrics history", getMetricsHistory)
}
