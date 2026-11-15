import type { Metadata } from "next"
import { HydrationBoundary } from "@tanstack/react-query"
import { GitOpsView } from "@/features/gitops/gitops-view"
import { queries } from "@/lib/api/queries"
import { getArgoApplications } from "@/server/k8s/argocd"
import { prefetch } from "@/server/prefetch"
export const metadata: Metadata = { title: "GitOps" }
export default async function GitOpsPage() {
  const state = await prefetch((c) =>
    c.prefetchQuery({
      ...queries.argoApplications(),
      queryFn: getArgoApplications,
    })
  )
  return (
    <HydrationBoundary state={state}>
      <GitOpsView />
    </HydrationBoundary>
  )
}