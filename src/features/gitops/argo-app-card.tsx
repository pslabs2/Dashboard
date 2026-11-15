import {
  ArrowRight,
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
  Package,
  Zap,
} from "lucide-react"

import { healthTone, syncTone, ToneBadge } from "@/components/dashboard/badges"
import { RelativeTime } from "@/components/dashboard/relative-time"
import { StatusDot } from "@/components/dashboard/status-dot"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { shortRevision } from "@/lib/format"
import type { ArgoApplication } from "@/lib/schemas"

/** `https://github.com/org/repo.git` → `org/repo`. */
function repoLabel(url: string | null) {
  if (!url) return "—"
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname.replace(/^\/+|\.git$|\/+$/g, "")
    return path || hostname
  } catch {
    return url.replace(/^.*[:/]([^/]+\/[^/]+?)(\.git)?$/, "$1")
  }
}

function destinationLabel(server: string | null) {
  if (!server || server === "https://kubernetes.default.svc")
    return "in-cluster"
  return server.replace(/^https?:\/\//, "")
}

export function ArgoAppCard({ app }: { app: ArgoApplication }) {
  const errors = app.conditions.filter((c) => /error/i.test(c.type))
  const warnings = app.conditions.filter((c) => !/error/i.test(c.type))
  const operationFailed =
    app.operation && ["Failed", "Error"].includes(app.operation.phase)

  return (
    <Card className="gap-4 py-5 transition-colors hover:border-primary/30">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2">
          <StatusDot
            tone={healthTone(app.healthStatus)}
            pulse={app.healthStatus === "Progressing"}
          />
          <span className="truncate">{app.name}</span>
        </CardTitle>
        <CardDescription className="truncate">
          {app.project} · {app.namespace}
        </CardDescription>
        <CardAction className="flex gap-1.5">
          <ToneBadge tone={healthTone(app.healthStatus)}>
            {app.healthStatus}
          </ToneBadge>
          <ToneBadge tone={syncTone(app.syncStatus)}>
            {app.syncStatus}
          </ToneBadge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3 px-5 text-sm">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
          <dt className="text-muted-foreground">
            {app.source.chart ? (
              <Package className="size-4" aria-label="Chart" />
            ) : (
              <FolderGit2 className="size-4" aria-label="Repository" />
            )}
          </dt>
          <dd
            className="min-w-0 truncate font-mono text-xs"
            title={app.source.repoURL ?? undefined}
          >
            {repoLabel(app.source.repoURL)}
            {app.source.chart
              ? ` · ${app.source.chart}`
              : app.source.path && app.source.path !== "."
                ? ` · ${app.source.path}`
                : ""}
            {app.source.count > 1 && (
              <Badge
                variant="secondary"
                className="ml-2 px-1.5 py-0 text-[10px]"
              >
                +{app.source.count - 1} sources
              </Badge>
            )}
          </dd>

          <dt className="text-muted-foreground">
            <GitCommitHorizontal className="size-4" aria-label="Revision" />
          </dt>
          <dd className="truncate font-mono text-xs">
            {shortRevision(app.revision)}
            {app.source.targetRevision && (
              <span className="text-muted-foreground">
                {" "}
                ({app.source.targetRevision})
              </span>
            )}
          </dd>

          <dt className="text-muted-foreground">
            <ArrowRight className="size-4" aria-label="Destination" />
          </dt>
          <dd className="truncate text-xs">
            {destinationLabel(app.destination.server)}
            {app.destination.namespace && (
              <span className="text-muted-foreground">
                {" "}
                / {app.destination.namespace}
              </span>
            )}
          </dd>
        </dl>

        {(errors.length > 0 || operationFailed) && (
          <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
            {operationFailed && app.operation?.message && (
              <p className="line-clamp-3">
                Sync {app.operation.phase.toLowerCase()}:{" "}
                {app.operation.message}
              </p>
            )}
            {errors.map((c, i) => (
              <p key={i} className="line-clamp-3">
                <span className="font-medium">{c.type}:</span> {c.message}
              </p>
            ))}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="space-y-1 rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs text-warning">
            {warnings.map((c, i) => (
              <p key={i} className="line-clamp-2">
                <span className="font-medium">{c.type}:</span> {c.message}
              </p>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto justify-between gap-2 px-5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {app.autoSync ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="flex items-center gap-1 text-info"
                  tabIndex={0}
                >
                  <Zap className="size-3.5" aria-hidden /> Auto-sync
                </span>
              </TooltipTrigger>
              <TooltipContent>Automated sync is enabled</TooltipContent>
            </Tooltip>
          ) : (
            <span>Manual sync</span>
          )}
          <span>{app.resourceCount} resources</span>
          <span>
            Reconciled <RelativeTime value={app.reconciledAt} />
          </span>
        </div>
        {app.url && (
          <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${app.name} in Argo CD`}
            >
              <ExternalLink aria-hidden />
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
