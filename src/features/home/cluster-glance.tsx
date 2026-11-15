"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  Cpu,
  GitBranch,
  MemoryStick,
  Server,
  type LucideIcon,
} from "lucide-react"

import { usageTone } from "@/components/dashboard/badges"
import { StatusDot, type Tone } from "@/components/dashboard/status-dot"
import { UsageMeter } from "@/components/dashboard/usage-meter"
import { Skeleton } from "@/components/ui/skeleton"
import { queries } from "@/lib/api/queries"
import { formatBytes, formatCores, formatPercent, ratio } from "@/lib/format"

function GlanceTile({
  href,
  icon: Icon,
  label,
  value,
  detail,
  tone,
  children,
}: {
  href: "/cluster" | "/workloads" | "/gitops"
  icon: LucideIcon
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  tone: Tone
  children?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2 font-medium tracking-wide uppercase">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
        <StatusDot tone={tone} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {detail && (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        )}
      </div>
      {children}
    </Link>
  )
}

function TileSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-1.5 w-full" />
    </div>
  )
}

/** Cluster summary strip on the home page. Hidden if the cluster is unreachable. */
export function ClusterGlance() {
  const overview = useQuery(queries.clusterOverview())
  const argo = useQuery(queries.argoApplications())

  if (overview.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (overview.isError) {
    return (
      <Link
        href="/cluster"
        className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
      >
        <StatusDot tone="error" pulse />
        <span>
          Kubernetes cluster unavailable:{" "}
          <span className="text-muted-foreground">
            {overview.error.message}
          </span>
        </span>
      </Link>
    )
  }

  const data = overview.data
  const cpuRatio = ratio(
    data.cpu.used ?? data.cpu.requested,
    data.cpu.allocatable
  )
  const memRatio = ratio(
    data.memory.used ?? data.memory.requested,
    data.memory.allocatable
  )
  const argoSummary = argo.data?.installed ? argo.data.summary : null
  const argoProblems = argoSummary
    ? argoSummary.total - Math.min(argoSummary.synced, argoSummary.healthy)
    : 0

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <GlanceTile
        href="/cluster"
        icon={Server}
        label="Nodes"
        value={`${data.nodes.ready}/${data.nodes.total}`}
        detail={`ready · ${data.pods.running} pods`}
        tone={data.nodes.ready < data.nodes.total ? "error" : "ok"}
      >
        <p className="text-xs text-muted-foreground">
          {data.pods.unhealthy > 0
            ? `${data.pods.unhealthy} unhealthy pod${data.pods.unhealthy === 1 ? "" : "s"}`
            : "All pods healthy"}
        </p>
      </GlanceTile>
      <GlanceTile
        href="/cluster"
        icon={Cpu}
        label="CPU"
        value={formatPercent(cpuRatio)}
        detail={`of ${formatCores(data.cpu.allocatable)}`}
        tone={usageTone(cpuRatio)}
      >
        <UsageMeter stat={data.cpu} format={formatCores} compact />
      </GlanceTile>
      <GlanceTile
        href="/cluster"
        icon={MemoryStick}
        label="Memory"
        value={formatPercent(memRatio)}
        detail={`of ${formatBytes(data.memory.allocatable)}`}
        tone={usageTone(memRatio)}
      >
        <UsageMeter stat={data.memory} format={formatBytes} compact />
      </GlanceTile>
      <GlanceTile
        href="/gitops"
        icon={GitBranch}
        label="GitOps"
        value={argoSummary ? `${argoSummary.synced}/${argoSummary.total}` : "—"}
        detail={
          argoSummary
            ? "synced"
            : argo.isPending
              ? "loading"
              : "Argo CD not found"
        }
        tone={!argoSummary ? "muted" : argoProblems > 0 ? "warning" : "ok"}
      >
        <p className="text-xs text-muted-foreground">
          {argoSummary
            ? argoSummary.degraded > 0
              ? `${argoSummary.degraded} degraded`
              : `${argoSummary.healthy} healthy`
            : "No Application CRD"}
        </p>
      </GlanceTile>
    </div>
  )
}
