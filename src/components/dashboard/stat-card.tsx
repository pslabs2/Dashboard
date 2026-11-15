import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import type { Tone } from "@/components/dashboard/status-dot"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const ICON_TONES: Record<Tone, string> = {
  ok: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  muted: "bg-muted text-muted-foreground",
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "muted",
  footer,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: Tone
  footer?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="truncate text-2xl font-semibold tabular-nums">
              {value}
            </p>
          </div>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              ICON_TONES[tone]
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {footer}
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-3 py-4">
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}
