import { handle } from "@/server/http"
import { getClusterOverview } from "@/server/k8s/cluster"

export function GET() {
  return handle("read the cluster overview", getClusterOverview)
}
