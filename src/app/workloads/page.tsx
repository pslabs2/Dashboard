import type { Metadata } from "next"
import { HydrationBoundary } from "@tanstack/react-query"
import { PodsView } from "@/features/workloads/pods-view"
import { queries } from "@/lib/api/queries"
import { getPods } from "@/server/k8s/cluster"
import { prefetch } from "@/server/prefetch"
export const metadata: Metadata = { title: "Workloads" }
export default async function WorkloadsPage() {
  const state = await prefetch((c) =>
    c.prefetchQuery({ ...queries.pods(), queryFn: getPods })
  )
  return (
    <HydrationBoundary state={state}>
      <PodsView />
    </HydrationBoundary>
  )
}