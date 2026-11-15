"use client"

import { useQuery } from "@tanstack/react-query"
import { CircleCheck, TriangleAlert } from "lucide-react"

import { QueryError } from "@/components/dashboard/query-error"
import { RelativeTime } from "@/components/dashboard/relative-time"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { queries } from "@/lib/api/queries"

export function EventsCard() {
  const events = useQuery(queries.events())

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Warning events</CardTitle>
        <CardDescription>
          Most recent Kubernetes warnings across all namespaces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.isError && !events.data ? (
          <QueryError
            error={events.error}
            onRetry={() => void events.refetch()}
          />
        ) : events.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : events.data.events.length === 0 ? (
          <Empty className="border border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleCheck className="text-success" aria-hidden />
              </EmptyMedia>
              <EmptyTitle>All quiet</EmptyTitle>
              <EmptyDescription>
                No warning events in the cluster.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="h-[420px] pr-3">
            <ol className="space-y-2">
              {events.data.events.map((event) => (
                <li
                  key={event.id}
                  className="flex gap-3 rounded-lg border bg-muted/20 p-3 text-sm"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">
                        {event.reason ?? "Warning"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {event.object.kind}/{event.object.name}
                      </span>
                      {event.namespace && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {event.namespace}
                        </Badge>
                      )}
                      {event.count > 1 && (
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px] tabular-nums"
                        >
                          ×{event.count}
                        </Badge>
                      )}
                    </div>
                    {event.message && (
                      <p className="text-xs break-words text-muted-foreground">
                        {event.message}
                      </p>
                    )}
                  </div>
                  <RelativeTime
                    value={event.lastSeen}
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                  />
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
