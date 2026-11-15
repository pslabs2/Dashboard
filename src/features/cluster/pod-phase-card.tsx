"use client"

import { Label, Pie, PieChart } from "recharts"

import {
  Card,
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
import { Skeleton } from "@/components/ui/skeleton"
import type { ClusterOverview } from "@/lib/schemas"

const chartConfig = {
  running: { label: "Running", color: "var(--success)" },
  pending: { label: "Pending", color: "var(--warning)" },
  succeeded: { label: "Succeeded", color: "var(--info)" },
  failed: { label: "Failed", color: "var(--destructive)" },
  unknown: { label: "Unknown", color: "var(--muted-foreground)" },
} satisfies ChartConfig

type Phase = keyof typeof chartConfig
const PHASES = Object.keys(chartConfig) as Phase[]

export function PodPhaseCard({ overview }: { overview?: ClusterOverview }) {
  const data = overview
    ? PHASES.map((phase) => ({
        phase,
        count: overview.pods[phase],
        fill: `var(--color-${phase})`,
      })).filter((entry) => entry.count > 0)
    : []

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Pod phases</CardTitle>
        <CardDescription>
          {overview
            ? `${overview.pods.unhealthy} need attention`
            : "Distribution across the cluster"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {!overview ? (
          <Skeleton className="size-[200px] rounded-full" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-[200px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent nameKey="phase" hideLabel />}
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="phase"
                innerRadius={62}
                outerRadius={90}
                strokeWidth={4}
                paddingAngle={data.length > 1 ? 2 : 0}
                isAnimationActive={false}
              >
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox)) return null
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-semibold"
                        >
                          {overview.pods.total}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 22}
                          className="fill-muted-foreground text-xs"
                        >
                          pods
                        </tspan>
                      </text>
                    )
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {PHASES.map((phase) => (
            <li key={phase} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: chartConfig[phase].color }}
                  aria-hidden
                />
                {chartConfig[phase].label}
              </span>
              <span className="font-medium tabular-nums">
                {overview ? overview.pods[phase] : "–"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
