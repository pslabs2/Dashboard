"use client"

import { useIsFetching } from "@tanstack/react-query"

import { StatusDot } from "@/components/dashboard/status-dot"

/** Shows that data is polled live, and when a refresh is in flight. */
export function LiveIndicator() {
  const fetching = useIsFetching() > 0

  return (
    <div
      className="hidden items-center gap-2 rounded-full border bg-card/50 px-2.5 py-1 text-xs text-muted-foreground sm:flex"
      role="status"
      aria-live="polite"
    >
      <StatusDot tone={fetching ? "info" : "ok"} pulse />
      <span>{fetching ? "Syncing" : "Live"}</span>
    </div>
  )
}
