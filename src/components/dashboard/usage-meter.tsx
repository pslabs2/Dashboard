import { usageTone } from "@/components/dashboard/badges"
import { formatPercent, ratio } from "@/lib/format"
import type { ResourceStat } from "@/lib/schemas"
import { cn } from "@/lib/utils"

const BAR_TONES = {
  ok: "bg-primary",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground/40",
} as const

const pct = (value: number | null) =>
  `${Math.min(100, Math.max(0, (value ?? 0) * 100)).toFixed(1)}%`

/**
 * Horizontal meter: the solid bar is live usage, the translucent bar is the
 * sum of resource requests, both relative to allocatable capacity.
 */
export function UsageMeter({
  stat,
  format,
  className,
  compact = false,
}: {
  stat: ResourceStat
  format: (value: number) => string
  className?: string
  compact?: boolean
}) {
  const usedRatio = ratio(stat.used, stat.allocatable)
  const requestedRatio = ratio(stat.requested, stat.allocatable)
  const tone = usageTone(usedRatio ?? requestedRatio)

  const label =
    stat.used === null
      ? `${format(stat.requested)} requested of ${format(stat.allocatable)}`
      : `${format(stat.used)} used, ${format(stat.requested)} requested of ${format(stat.allocatable)}`

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          compact ? "h-1.5" : "h-2"
        )}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={stat.allocatable}
        aria-valuenow={stat.used ?? stat.requested}
        title={label}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/25 transition-[width] duration-500"
          style={{ width: pct(requestedRatio) }}
        />
        {usedRatio !== null && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
              BAR_TONES[tone]
            )}
            style={{ width: pct(usedRatio) }}
          />
        )}
      </div>
      {!compact && (
        <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
          <span>
            {stat.used === null ? "—" : formatPercent(usedRatio)} used
          </span>
          <span>{formatPercent(requestedRatio)} requested</span>
        </div>
      )}
    </div>
  )
}
