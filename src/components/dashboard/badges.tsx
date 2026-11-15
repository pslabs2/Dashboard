import type { ReactNode } from "react"

import type { Tone } from "@/components/dashboard/status-dot"
import { Badge } from "@/components/ui/badge"
import type { HealthStatus, Severity, SyncStatus } from "@/lib/schemas"
import { cn } from "@/lib/utils"

const BADGE_TONES: Record<Tone, string> = {
  ok: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
  muted: "border-border bg-muted text-muted-foreground",
}

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(BADGE_TONES[tone], className)}>
      {children}
    </Badge>
  )
}

export const severityTone = (severity: Severity): Tone => severity

export function healthTone(status: HealthStatus): Tone {
  switch (status) {
    case "Healthy":
      return "ok"
    case "Progressing":
      return "info"
    case "Degraded":
    case "Missing":
      return "error"
    case "Suspended":
      return "warning"
    default:
      return "muted"
  }
}

export function syncTone(status: SyncStatus): Tone {
  if (status === "Synced") return "ok"
  if (status === "OutOfSync") return "warning"
  return "muted"
}

/** Color for a utilization ratio (0..1). */
export function usageTone(value: number | null): Tone {
  if (value === null) return "muted"
  if (value >= 0.9) return "error"
  if (value >= 0.75) return "warning"
  return "ok"
}
