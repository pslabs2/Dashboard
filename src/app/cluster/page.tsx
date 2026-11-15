import type { Metadata } from "next"
import { HydrationBoundary } from "@tanstack/react-query"

import { ClusterView } from "@/features/cluster/cluster-view"
import { queries } from "@/lib/api/queries"
import {
  getClusterOverview,
  getNodes,
  getWarningEvents,
} from "@/server/k8s/cluster"
import { getMetricsHistory } from "@/server/metrics-history"
import { prefetch } from "@/server/prefetch"

export const metadata: Metadata = { title: "Cluster" }

export default async function ClusterPage() {
  const state = await prefetch(
    (c) =>
      c.prefetchQuery({
        ...queries.clusterOverview(),
        queryFn: getClusterOverview,
      }),
    (c) => c.prefetchQuery({ ...queries.nodes(), queryFn: getNodes }),
    (c) =>
      c.prefetchQuery({
        ...queries.metricsHistory(),
        queryFn: getMetricsHistory,
      }),
    (c) =>
      c.prefetchQuery({
        ...queries.events(),
        queryFn: () => getWarningEvents(),
      })
  )

  return (
    <HydrationBoundary state={state}>
      <ClusterView />
    </HydrationBoundary>
  )
}
