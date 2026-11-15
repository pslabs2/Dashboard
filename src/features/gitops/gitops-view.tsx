"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CircleCheck,
  ExternalLink,
  GitBranch,
  HeartPulse,
  RefreshCcwDot,
  Search,
  SearchX,
  TriangleAlert,
} from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { QueryError } from "@/components/dashboard/query-error"
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArgoAppCard } from "@/features/gitops/argo-app-card"
import { queries } from "@/lib/api/queries"
import type { ArgoApplication } from "@/lib/schemas"

const FILTERS = {
  all: { label: "All", match: () => true },
  outOfSync: {
    label: "Out of sync",
    match: (app: ArgoApplication) => app.syncStatus !== "Synced",
  },
  unhealthy: {
    label: "Unhealthy",
    match: (app: ArgoApplication) => app.healthStatus !== "Healthy",
  },
} as const

type Filter = keyof typeof FILTERS

const ATTENTION_RANK = (app: ArgoApplication) =>
  (app.healthStatus === "Degraded" || app.healthStatus === "Missing" ? 0 : 2) +
  (app.syncStatus === "OutOfSync" ? 0 : 1)

export function GitOpsView() {
  const argo = useQuery(queries.argoApplications())
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const query = useDeferredValue(search.trim().toLowerCase())

  const applications = useMemo(
    () =>
      (argo.data?.applications ?? [])
        .filter(FILTERS[filter].match)
        .filter(
          (app) =>
            !query ||
            app.name.toLowerCase().includes(query) ||
            app.project.toLowerCase().includes(query) ||
            (app.destination.namespace?.toLowerCase().includes(query) ?? false)
        )
        .sort(
          (a, b) =>
            ATTENTION_RANK(a) - ATTENTION_RANK(b) ||
            a.name.localeCompare(b.name)
        ),
    [argo.data, filter, query]
  )

  const counts = useMemo(() => {
    const apps = argo.data?.applications ?? []
    return Object.fromEntries(
      (Object.keys(FILTERS) as Filter[]).map((key) => [
        key,
        apps.filter(FILTERS[key].match).length,
      ])
    ) as Record<Filter, number>
  }, [argo.data])

  const header = (
    <PageHeader
      title="GitOps"
      description="Argo CD applications, sync state and health."
    >
      {argo.data?.uiUrl && (
        <Button variant="outline" asChild>
          <a href={argo.data.uiUrl} target="_blank" rel="noopener noreferrer">
            Open Argo CD <ExternalLink aria-hidden />
          </a>
        </Button>
      )}
    </PageHeader>
  )

  if (argo.isError && !argo.data) {
    return (
      <>
        {header}
        <QueryError
          error={argo.error}
          title="Could not load Argo CD applications"
          onRetry={() => void argo.refetch()}
        />
      </>
    )
  }

  if (argo.isPending) {
    return (
      <>
        {header}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </>
    )
  }

  const { summary, installed } = argo.data

  if (!installed) {
    return (
      <>
        {header}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitBranch aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Argo CD not detected</EmptyTitle>
            <EmptyDescription>
              The <code>applications.argoproj.io</code> CRD is not installed in
              this cluster.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    )
  }

  return (
    <>
      {header}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={summary.total}
          hint="Managed by Argo CD"
          icon={GitBranch}
          tone="info"
        />
        <StatCard
          label="Synced"
          value={`${summary.synced}/${summary.total}`}
          hint={
            summary.outOfSync > 0
              ? `${summary.outOfSync} out of sync`
              : "Matches Git"
          }
          icon={RefreshCcwDot}
          tone={summary.outOfSync > 0 ? "warning" : "ok"}
        />
        <StatCard
          label="Healthy"
          value={`${summary.healthy}/${summary.total}`}
          hint={
            summary.progressing > 0
              ? `${summary.progressing} progressing`
              : "All resources healthy"
          }
          icon={HeartPulse}
          tone={summary.healthy < summary.total ? "warning" : "ok"}
        />
        <StatCard
          label="Degraded"
          value={summary.degraded}
          hint={summary.degraded > 0 ? "Needs attention" : "Nothing degraded"}
          icon={summary.degraded > 0 ? TriangleAlert : CircleCheck}
          tone={summary.degraded > 0 ? "error" : "ok"}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as Filter)}
        >
          <TabsList>
            {(Object.keys(FILTERS) as Filter[]).map((key) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                {FILTERS[key].label}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {counts[key]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search applications…"
            aria-label="Search Argo CD applications"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {applications.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {summary.total === 0 ? (
                <GitBranch aria-hidden />
              ) : (
                <SearchX aria-hidden />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {summary.total === 0 ? "No applications" : "Nothing matches"}
            </EmptyTitle>
            <EmptyDescription>
              {summary.total === 0
                ? "Argo CD is installed but no Application resources were found."
                : "No application matches the current filter."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {applications.map((app) => (
            <ArgoAppCard key={`${app.namespace}/${app.name}`} app={app} />
          ))}
        </div>
      )}
    </>
  )
}
