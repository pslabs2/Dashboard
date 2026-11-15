import "server-only"

import { dehydrate, QueryClient } from "@tanstack/react-query"
import { connection } from "next/server"

import { logger } from "@/server/log"

/** Upper bound on how long a page waits for server-side data. */
const PREFETCH_BUDGET_MS = 2_500

type Prefetch = (client: QueryClient) => Promise<unknown>

/**
 * Prefetches queries on the server, calling the server layer directly (no
 * HTTP hop), and returns state for `<HydrationBoundary>`. Slow or failing
 * queries are left out and simply load on the client instead, so a degraded
 * cluster never blocks the page.
 *
 * Usage: `prefetch((c) => c.prefetchQuery({ ...queries.nodes(), queryFn: getNodes }))`
 */
export async function prefetch(...tasks: Prefetch[]) {
  // Live cluster data is never prerendered; this also keeps `next build`
  // from contacting the cluster.
  await connection()

  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000, retry: false } },
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  const budget = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), PREFETCH_BUDGET_MS)
  })

  const result = await Promise.race([
    Promise.allSettled(tasks.map((task) => task(client))),
    budget,
  ])
  clearTimeout(timer)
  if (result === "timeout") {
    logger.throttled(
      "prefetch-timeout",
      "warn",
      "Server prefetch exceeded budget; continuing on the client"
    )
  }

  // Only successful queries are dehydrated.
  return dehydrate(client)
}
