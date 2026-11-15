"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LayoutGrid, Search, TriangleAlert } from "lucide-react"

import { QueryError } from "@/components/dashboard/query-error"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppCard, AppCardSkeleton } from "@/features/home/app-card"
import { ClusterGlance } from "@/features/home/cluster-glance"
import { queries } from "@/lib/api/queries"
import type { AppStatus, LauncherApp } from "@/lib/schemas"

function matches(app: LauncherApp, query: string) {
  if (!query) return true
  return [app.name, app.description ?? "", app.group, app.url].some((field) =>
    field.toLowerCase().includes(query)
  )
}

export function HomeView() {
  const apps = useQuery(queries.apps())
  const statuses = useQuery(queries.appStatus())
  const [search, setSearch] = useState("")
  const query = useDeferredValue(search.trim().toLowerCase())

  const statusById = useMemo(
    () =>
      new Map<string, AppStatus>(
        statuses.data?.statuses.map((status) => [status.id, status])
      ),
    [statuses.data]
  )

  const groups = useMemo(
    () =>
      (apps.data?.groups ?? [])
        .map((group) => ({
          ...group,
          apps: group.apps.filter((app) => matches(app, query)),
        }))
        .filter((group) => group.apps.length > 0),
    [apps.data, query]
  )

  const total = apps.data?.groups.reduce((n, g) => n + g.apps.length, 0) ?? 0
  const down =
    statuses.data?.statuses.filter((s) => s.status === "down").length ?? 0

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-5 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)] opacity-60" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            {apps.data ? (
              <>
                <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  {apps.data.title}
                </h2>
                <p className="max-w-prose text-pretty text-muted-foreground">
                  {apps.data.subtitle ??
                    `${total} application${total === 1 ? "" : "s"}${
                      statuses.data
                        ? down > 0
                          ? `, ${down} unreachable`
                          : ", all reachable"
                        : ""
                    }`}
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-5 w-72" />
              </>
            )}
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter applications…"
              aria-label="Filter applications"
              className="h-10 bg-background/60 pl-9 backdrop-blur"
            />
          </div>
        </div>
      </section>

      <ClusterGlance />

      {apps.data?.warnings.map((warning) => (
        <Alert key={warning}>
          <TriangleAlert aria-hidden />
          <AlertTitle>Partial results</AlertTitle>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}

      {apps.isError && !apps.data ? (
        <QueryError
          error={apps.error}
          title="Could not load applications"
          onRetry={() => void apps.refetch()}
        />
      ) : apps.isPending ? (
        <section className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <AppCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : groups.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutGrid aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {total === 0 ? "No applications yet" : "No matches"}
            </EmptyTitle>
            <EmptyDescription>
              {total === 0 ? (
                <>
                  Add apps to <code>config/dashboard.yaml</code> or annotate an
                  Ingress with{" "}
                  <code>dashboard.homelab/enabled: &quot;true&quot;</code>.
                </>
              ) : (
                <>No application matches &ldquo;{search}&rdquo;.</>
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        groups.map((group) => (
          <section
            key={group.name}
            className="space-y-3"
            aria-labelledby={`group-${group.name}`}
          >
            <div className="flex items-center gap-3">
              <h3
                id={`group-${group.name}`}
                className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
              >
                {group.name}
              </h3>
              <span className="text-xs text-muted-foreground/70 tabular-nums">
                {group.apps.length}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {group.apps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  status={statusById.get(app.id)}
                  statusLoading={statuses.isPending}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
