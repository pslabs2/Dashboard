"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { QueryError } from "@/components/dashboard/query-error"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useHydrated } from "@/hooks/use-hydrated"
import { queries } from "@/lib/api/queries"
import { formatBytes, formatCores, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

type Metric = "cpu" | "memory"

const chartConfig = {
  cpu: { label: "CPU", color: "var(--chart-1)" },
  memory: { label: "Memory", color: "var(--chart-2)" },
} satisfies ChartConfig

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
})

export function UsageHistoryCard({ className }: { className?: string }) {
  const history = useQuery(queries.metricsHistory())
  const [metric, setMetric] = useState<Metric>("cpu")
  // Axis labels use the browser's timezone, so skip server rendering.
  const hydrated = useHydrated()

  const data = useMemo(() => {
    if (!history.data) return []
    const { capacity } = history.data
    return history.data.samples.map((sample) => ({
      timestamp: sample.timestamp,
      cpu: capacity.cpuCores > 0 ? sample.cpuCores / capacity.cpuCores : 0,
      memory:
        capacity.memoryBytes > 0
          ? sample.memoryBytes / capacity.memoryBytes
          : 0,
      cpuCores: sample.cpuCores,
      memoryBytes: sample.memoryBytes,
    }))
  }, [history.data])

  const latest = data.at(-1)
  const absolute = (point: (typeof data)[number] | undefined) =>
    !point
      ? "—"
      : metric === "cpu"
        ? formatCores(point.cpuCores)
        : formatBytes(point.memoryBytes)

  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle>Resource usage</CardTitle>
        <CardDescription>
          {latest
            ? `${formatPercent(latest[metric])} · ${absolute(latest)} now`
            : "Cluster-wide utilization from metrics-server"}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={metric}
            onValueChange={(value) => value && setMetric(value as Metric)}
            aria-label="Metric"
          >
            <ToggleGroupItem value="cpu" className="px-3">
              CPU
            </ToggleGroupItem>
            <ToggleGroupItem value="memory" className="px-3">
              Memory
            </ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {history.isError && !history.data ? (
          <QueryError
            error={history.error}
            onRetry={() => void history.refetch()}
          />
        ) : history.isPending || !hydrated ? (
          <Skeleton className="h-[260px] w-full" />
        ) : data.length < 2 ? (
          <Empty className="h-[260px] border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Activity aria-hidden />
              </EmptyMedia>
              <EmptyTitle>Collecting samples</EmptyTitle>
              <EmptyDescription>
                {data.length === 0
                  ? "No metrics yet. Is metrics-server installed?"
                  : `A new sample is recorded every ${Math.round(history.data.intervalMs / 1000)}s.`}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full"
          >
            <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
              <defs>
                <linearGradient
                  id={`fill-${metric}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${metric})`}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${metric})`}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={48}
                tickFormatter={(value: number) => timeFormat.format(value)}
              />
              <YAxis
                domain={[0, 1]}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(value: number) => formatPercent(value)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) => {
                      const ts = payload?.[0]?.payload?.timestamp
                      return typeof ts === "number" ? timeFormat.format(ts) : ""
                    }}
                    formatter={(value, _name, item) => (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted-foreground">
                          {chartConfig[metric].label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatPercent(Number(value), 1)} ·{" "}
                          {absolute(item.payload as (typeof data)[number])}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                dataKey={metric}
                type="monotone"
                fill={`url(#fill-${metric})`}
                stroke={`var(--color-${metric})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
