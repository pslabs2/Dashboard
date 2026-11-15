import { HydrationBoundary } from "@tanstack/react-query"

import { HomeView } from "@/features/home/home-view"
import { queries } from "@/lib/api/queries"
import { getApps } from "@/server/apps"
import { getArgoApplications } from "@/server/k8s/argocd"
import { getClusterOverview } from "@/server/k8s/cluster"
import { prefetch } from "@/server/prefetch"

export default async function HomePage() {
  // App health probes are left to the client so a slow app never delays
  // the first paint.
  const state = await prefetch(
    (c) => c.prefetchQuery({ ...queries.apps(), queryFn: getApps }),
    (c) =>
      c.prefetchQuery({
        ...queries.clusterOverview(),
        queryFn: getClusterOverview,
      }),
    (c) =>
      c.prefetchQuery({
        ...queries.argoApplications(),
        queryFn: getArgoApplications,
      })
  )

  return (
    <HydrationBoundary state={state}>
      <HomeView />
    </HydrationBoundary>
  )
}
