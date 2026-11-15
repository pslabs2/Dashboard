import { ArrowUpRight } from "lucide-react"

import { AppIcon } from "@/components/dashboard/app-icon"
import { StatusDot, type Tone } from "@/components/dashboard/status-dot"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AppStatus, LauncherApp } from "@/lib/schemas"

function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function statusInfo(
  app: LauncherApp,
  status: AppStatus | undefined,
  loading: boolean
): { tone: Tone; label: string } {
  if (!app.healthCheck)
    return { tone: "muted", label: "Status checks disabled" }
  if (!status)
    return { tone: "muted", label: loading ? "Checking…" : "Unknown" }
  if (status.status === "up") {
    return {
      tone: "ok",
      label: `Up · HTTP ${status.statusCode} · ${status.latencyMs} ms`,
    }
  }
  return {
    tone: "error",
    label: status.statusCode
      ? `Down · HTTP ${status.statusCode}`
      : "Unreachable",
  }
}

export function AppCard({
  app,
  status,
  statusLoading,
}: {
  app: LauncherApp
  status: AppStatus | undefined
  statusLoading: boolean
}) {
  const { tone, label } = statusInfo(app, status, statusLoading)

  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all duration-200 outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transform-none"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br from-muted to-background text-primary transition-colors group-hover:border-primary/30">
        <AppIcon icon={app.icon} name={app.name} className="size-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{app.name}</span>
          <ArrowUpRight
            className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {app.description ?? hostOf(app.url)}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex shrink-0 items-center gap-1.5 self-start pt-1 text-[11px] text-muted-foreground tabular-nums">
            {status?.latencyMs != null && (
              <span className="hidden sm:inline">{status.latencyMs} ms</span>
            )}
            <StatusDot tone={tone} pulse={tone === "error"} />
            <span className="sr-only">{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">{label}</TooltipContent>
      </Tooltip>
    </a>
  )
}

export function AppCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <Skeleton className="size-11 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  )
}
