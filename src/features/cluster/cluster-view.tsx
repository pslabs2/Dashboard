"use client"

import { useQuery } from "@tanstack/react-query"
import { Boxes, Cpu, Layers, MemoryStick, Server } from "lucide-react"

import { usageTone } from "@/components/dashboard/badges"
import { PageHeader } from "@/components/dashboard/page-header"
import { QueryError } from "@/components/dashboard/query-error"
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card"
import { UsageMeter } from "@/components/dashboard/usage-meter"
import { EventsCard } from "@/features/cluster/events-card"
import { NodesCard } from "@/features/cluster/nodes-card"
import { PodPhaseCard } from "@/features/cluster/pod-phase-card"
import { UsageHistoryCard } from "@/features/cluster/usage-history-card"
import { queries } from "@/lib/api/queries"
import { formatBytes, formatCores, formatPercent, ratio } from "@/lib/format"
import type { ClusterOverview } from "@/lib/schemas"

function OverviewStats({ data }: { data: ClusterOverview }) {
  const { deployments, statefulSets, daemonSets } = data.workloads
  const workloadsReady =
    deployments.ready + statefulSets.ready + daemonSets.ready
  const workloadsTotal =
    deployments.total + statefulSets.total + daemonSets.total
  const cpuRatio = ratio(data.cpu.used, data.cpu.allocatable)
  const memRatio = ratio(data.memory.used, data.memory.allocatable)

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Nodes"
        value={`${data.nodes.ready}/${data.nodes.total}`}
        hint={data.version ? `Kubernetes ${data.version}` : "Ready nodes"}
        icon={Server}
        tone={data.nodes.ready < data.nodes.total ? "error" : "ok"}
      />
      <StatCard
        label="Pods"
        value={data.pods.running}
        hint={
          data.pods.unhealthy > 0
            ? `${data.pods.unhealthy} unhealthy · ${data.pods.total} total`
            : `running · ${data.pods.total} total`
        }
        icon={Boxes}
        tone={data.pods.unhealthy > 0 ? "warning" : "ok"}
      />
      <StatCard
        label="Workloads"
        value={`${workloadsReady}/${workloadsTotal}`}
        hint={`${deployments.total} deploy · ${statefulSets.total} sts · ${daemonSets.total} ds`}
        icon={Layers}
        tone={workloadsReady < workloadsTotal ? "warning" : "ok"}
      />
      <StatCard
        label="CPU"
        value={
          data.metricsAvailable
            ? formatPercent(cpuRatio)
            : formatCores(data.cpu.requested)
        }
        hint={
          data.metricsAvailable
            ? `${formatCores(data.cpu.used)} of ${formatCores(data.cpu.allocatable)}`
            : `requested of ${formatCores(data.cpu.allocatable)}`
        }
        icon={Cpu}
        tone={usageTone(cpuRatio)}
        footer={<UsageMeter stat={data.cpu} format={formatCores} compact />}
      />
      <StatCard
        label="Memory"
        value={
          data.metricsAvailable
            ? formatPercent(memRatio)
            : formatBytes(data.memory.requested)
        }
        hint={
          data.metricsAvailable
            ? `${formatBytes(data.memory.used)} of ${formatBytes(data.memory.allocatable)}`
            : `requested of ${formatBytes(data.memory.allocatable)}`
        }
        icon={MemoryStick}
        tone={usageTone(memRatio)}
        footer={<UsageMeter stat={data.memory} format={formatBytes} compact />}
      />
    </div>
  )
}

export function ClusterView() {
  const overview = useQuery(queries.clusterOverview())

  return (
    <>
      <PageHeader
        title="Cluster"
        description="Live capacity, node health and warning events."
      />

      {overview.isError && !overview.data ? (
        <QueryError
          error={overview.error}
          title="Cannot reach the cluster"
          onRetry={() => void overview.refetch()}
        />
      ) : overview.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <OverviewStats data={overview.data} />
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <UsageHistoryCard className="xl:col-span-2" />
        <PodPhaseCard overview={overview.data} />
      </div>

      <NodesCard />
      <EventsCard />
    </>
  )
}
