"use client"

import { useQuery } from "@tanstack/react-query"

import { StatusDot } from "@/components/dashboard/status-dot"
import { useSidebar } from "@/components/ui/sidebar"
import { queries } from "@/lib/api/queries"

/** Compact cluster connectivity summary shown at the bottom of the sidebar. */
export function ClusterStatusFooter() {
  const { state, isMobile } = useSidebar()
  const { data, isError, isPending } = useQuery(queries.clusterOverview())

  const tone = isPending
    ? "muted"
    : isError
      ? "error"
      : data.nodes.ready < data.nodes.total
        ? "warning"
        : "ok"
  const label = isPending
    ? "Connecting…"
    : isError
      ? "Cluster unreachable"
      : `${data.nodes.ready}/${data.nodes.total} nodes ready`

  return (
    <div
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground"
      title={label}
    >
      <StatusDot tone={tone} pulse={tone === "ok"} />
      {(state === "expanded" || isMobile) && (
        <div className="grid min-w-0 leading-tight">
          <span className="truncate text-foreground">{label}</span>
          {data?.version && (
            <span className="truncate font-mono">{data.version}</span>
          )}
        </div>
      )}
    </div>
  )
}
