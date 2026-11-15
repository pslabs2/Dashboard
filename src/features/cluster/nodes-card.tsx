"use client"

import { useQuery } from "@tanstack/react-query"

import { ToneBadge } from "@/components/dashboard/badges"
import { QueryError } from "@/components/dashboard/query-error"
import { RelativeTime } from "@/components/dashboard/relative-time"
import { UsageMeter } from "@/components/dashboard/usage-meter"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { queries } from "@/lib/api/queries"
import { formatBytes, formatCores } from "@/lib/format"
import type { NodeSummary } from "@/lib/schemas"

function NodeStatus({ node }: { node: NodeSummary }) {
  const badge = !node.ready ? (
    <ToneBadge tone="error">NotReady</ToneBadge>
  ) : node.problems.length > 0 ? (
    <ToneBadge tone="warning">Degraded</ToneBadge>
  ) : (
    <ToneBadge tone="ok">Ready</ToneBadge>
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {node.problems.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{badge}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <ul className="space-y-1">
              {node.problems.map((p) => (
                <li key={p.type}>
                  <span className="font-medium">{p.type}</span>
                  {p.message ? `: ${p.message}` : ""}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : (
        badge
      )}
      {!node.schedulable && <ToneBadge tone="muted">Cordoned</ToneBadge>}
    </div>
  )
}

function ResourceCell({
  stat,
  format,
}: {
  stat: NodeSummary["cpu"]
  format: (value: number) => string
}) {
  return (
    <div className="w-36 space-y-1">
      <div className="flex justify-between text-xs tabular-nums">
        <span>{stat.used === null ? "—" : format(stat.used)}</span>
        <span className="text-muted-foreground">
          {format(stat.allocatable)}
        </span>
      </div>
      <UsageMeter stat={stat} format={format} compact />
    </div>
  )
}

export function NodesCard() {
  const nodes = useQuery(queries.nodes())

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Nodes</CardTitle>
        <CardDescription>
          Solid bars show live usage, faded bars show resource requests.
          {nodes.data &&
            !nodes.data.metricsAvailable &&
            " Live usage needs metrics-server."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {nodes.isError && !nodes.data ? (
          <QueryError
            error={nodes.error}
            onRetry={() => void nodes.refetch()}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead className="text-right">Pods</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Version
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Address
                  </TableHead>
                  <TableHead className="text-right">Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.isPending
                  ? Array.from({ length: 3 }, (_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }, (_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : nodes.data.nodes.map((node) => (
                      <TableRow key={node.name}>
                        <TableCell>
                          <div className="font-medium">{node.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(node.roles.length ? node.roles : ["worker"]).map(
                              (role) => (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  {role}
                                </Badge>
                              )
                            )}
                            {node.architecture && (
                              <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {node.architecture}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <NodeStatus node={node} />
                        </TableCell>
                        <TableCell>
                          <ResourceCell stat={node.cpu} format={formatCores} />
                        </TableCell>
                        <TableCell>
                          <ResourceCell
                            stat={node.memory}
                            format={(v) => formatBytes(v, 1)}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {node.pods.running}
                          <span className="text-muted-foreground">
                            /{node.pods.capacity}
                          </span>
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs lg:table-cell">
                          <div>{node.kubeletVersion ?? "—"}</div>
                          <div
                            className="max-w-48 truncate text-muted-foreground"
                            title={node.osImage ?? undefined}
                          >
                            {node.osImage}
                          </div>
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs md:table-cell">
                          {node.internalIP ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          <RelativeTime value={node.createdAt} format="age" />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
