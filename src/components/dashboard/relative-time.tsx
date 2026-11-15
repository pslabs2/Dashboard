"use client"

import { useEffect, useState } from "react"

import { formatAge, formatRelativeTime } from "@/lib/format"

/** Current time, refreshed every `intervalMs` so relative labels stay fresh. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * Relative timestamp ("3 min. ago" or kubectl-style "3m"). The server and
 * browser render at slightly different times, so hydration warnings for the
 * text are suppressed.
 */
export function RelativeTime({
  value,
  format = "relative",
  className,
}: {
  value: string | number | null | undefined
  format?: "relative" | "age"
  className?: string
}) {
  const now = useNow()
  if (value === null || value === undefined) {
    return <span className={className}>—</span>
  }
  const iso = typeof value === "number" ? new Date(value).toISOString() : value
  return (
    <time
      dateTime={iso}
      title={new Date(iso).toLocaleString()}
      className={className}
      suppressHydrationWarning
    >
      {format === "age" ? formatAge(iso, now) : formatRelativeTime(iso, now)}
    </time>
  )
}
