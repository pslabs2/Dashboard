"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Search, SearchX } from "lucide-react"

import { ToneBadge } from "@/components/dashboard/badges"
import { PageHeader } from "@/components/dashboard/page-header"
import { QueryError } from "@/components/dashboard/query-error"
import { RelativeTime } from "@/components/dashboard/relative-time"
import { StatusDot } from "@/components/dashboard/status-dot"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { queries } from "@/lib/api/queries"
import { formatBytes, formatCores } from "@/lib/format"
import type { PodSummary, Severity } from "@/lib/schemas"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 100
const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, ok: 2 }

type HealthFilter = "all" | "unhealthy"

function NamespacePicker({
  namespaces,
  value,
  onChange,
}: {
  namespaces: string[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const select = (next: string | null) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by namespace"
          className="w-full justify-between sm:w-56"
        >
          <span className="truncate">{value ?? "All namespaces"}</span>
          <ChevronsUpDown className="opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Find namespace…" />
          <CommandList>
            <CommandEmpty>No namespace found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all__" onSelect={() => select(null)}>
                <Check
                  className={cn(value === null ? "opacity-100" : "opacity-0")}
                  aria-hidden
                />
                All namespaces
              </CommandItem>
              {namespaces.map((ns) => (
                <CommandItem key={ns} value={ns} onSelect={() => select(ns)}>
                  <Check
                    className={cn(value === ns ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                  {ns}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function PodRow({ pod, metrics }: { pod: PodSummary; metrics: boolean }) {
  return (
    <TableRow>
      <TableCell className="max-w-[18rem]">
        <div className="flex items-center gap-2">
          <StatusDot tone={pod.severity} />
          <span className="truncate font-medium" title={pod.name}>
            {pod.name}
          </span>
        </div>
        <div className="truncate pl-4 text-xs text-muted-foreground">
          {pod.ownerKind ?? "Pod"}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{pod.namespace}</TableCell>
      <TableCell>
        <ToneBadge tone={pod.severity}>{pod.status}</ToneBadge>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {pod.readyContainers}/{pod.totalContainers}
      </TableCell>
      <TableCell
        className={cn(
          "text-right tabular-nums",
          pod.restarts > 0 && "font-medium text-warning"
        )}
      >
        {pod.restarts}
      </TableCell>
      {metrics && (
        <>
          <TableCell className="hidden text-right tabular-nums md:table-cell">
            {formatCores(pod.cpuCores)}
          </TableCell>
          <TableCell className="hidden text-right tabular-nums md:table-cell">
            {formatBytes(pod.memoryBytes)}
          </TableCell>
        </>
      )}
      <TableCell className="hidden max-w-[10rem] truncate text-muted-foreground xl:table-cell">
        {pod.node ?? "—"}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        <RelativeTime value={pod.createdAt} format="age" />
      </TableCell>
    </TableRow>
  )
}

export function PodsView() {
  const pods = useQuery(queries.pods())
  const [namespace, setNamespace] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthFilter>("all")
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(PAGE_SIZE)
  const query = useDeferredValue(search.trim().toLowerCase())

  const filtered = useMemo(() => {
    const list = (pods.data?.pods ?? []).filter(
      (pod) =>
        (!namespace || pod.namespace === namespace) &&
        (health === "all" || pod.severity !== "ok") &&
        (!query ||
          pod.name.toLowerCase().includes(query) ||
          pod.status.toLowerCase().includes(query) ||
          (pod.node?.toLowerCase().includes(query) ?? false))
    )
    return list.sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.namespace.localeCompare(b.namespace) ||
        a.name.localeCompare(b.name)
    )
  }, [pods.data, namespace, health, query])

  const unhealthy =
    pods.data?.pods.filter((p) => p.severity !== "ok").length ?? 0
  const metrics = pods.data?.metricsAvailable ?? false
  const columns = metrics ? 9 : 7

  return (
    <>
      <PageHeader
        title="Workloads"
        description="Every pod in the cluster, problems first."
      />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Pods</CardTitle>
          <CardDescription>
            {pods.data
              ? `${filtered.length} of ${pods.data.pods.length} pods · ${unhealthy} need attention`
              : "Loading pods…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search by name, status or node…"
                aria-label="Search pods"
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setLimit(PAGE_SIZE)
                }}
              />
            </div>
            <NamespacePicker
              namespaces={pods.data?.namespaces ?? []}
              value={namespace}
              onChange={(value) => {
                setNamespace(value)
                setLimit(PAGE_SIZE)
              }}
            />
            <ToggleGroup
              type="single"
              variant="outline"
              value={health}
              onValueChange={(value) =>
                value && setHealth(value as HealthFilter)
              }
              aria-label="Health filter"
            >
              <ToggleGroupItem value="all" className="px-3">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="unhealthy" className="px-3">
                Unhealthy
                {unhealthy > 0 && (
                  <span className="ml-1 rounded bg-destructive/15 px-1 text-[10px] text-destructive tabular-nums">
                    {unhealthy}
                  </span>
                )}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {pods.isError && !pods.data ? (
            <QueryError
              error={pods.error}
              onRetry={() => void pods.refetch()}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ready</TableHead>
                    <TableHead className="text-right">Restarts</TableHead>
                    {metrics && (
                      <>
                        <TableHead className="hidden text-right md:table-cell">
                          CPU
                        </TableHead>
                        <TableHead className="hidden text-right md:table-cell">
                          Memory
                        </TableHead>
                      </>
                    )}
                    <TableHead className="hidden xl:table-cell">Node</TableHead>
                    <TableHead className="text-right">Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pods.isPending ? (
                    Array.from({ length: 8 }, (_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: columns }, (_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns}>
                        <Empty className="py-10">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <SearchX aria-hidden />
                            </EmptyMedia>
                            <EmptyTitle>No pods match</EmptyTitle>
                            <EmptyDescription>
                              Try a different namespace or search term.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered
                      .slice(0, limit)
                      .map((pod) => (
                        <PodRow
                          key={`${pod.namespace}/${pod.name}`}
                          pod={pod}
                          metrics={metrics}
                        />
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {filtered.length > limit && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                Show more ({filtered.length - limit} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
